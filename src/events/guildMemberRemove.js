const { EmbedBuilder, ChannelType } = require('discord.js');
const { pool } = require('../../config/config');
const { reportInternalError } = require('../services/reportErrorService');

// Function to delete a user's messages
async function deleteUserMessages(member) {
  let totalDeleted = 0;
  const userId = member.user.id;
  const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
  
  // Iterate through all text channels in the server
  const textChannels = member.guild.channels.cache.filter(
    channel => channel.isTextBased() && channel.type !== ChannelType.DM
  );
  
  console.log(`  🔍 Scanning ${textChannels.size} channel(s)...`);
  
  for (const channel of textChannels.values()) {
    try {
      // Check bot permissions
      const botMember = member.guild.members.me;
      if (!botMember) {
        console.log(`  ⚠️ Bot member not found for ${channel.name}`);
        continue;
      }
      
      const permissions = channel.permissionsFor(botMember);
      if (!permissions?.has(['ViewChannel', 'ManageMessages', 'ReadMessageHistory'])) {
        console.log(`  ⚠️ Insufficient permissions in #${channel.name}`);
        continue;
      }
      
      let hasMore = true;
      let lastMessageId = null;
      let channelDeleted = 0;
      let messagesChecked = 0;
      
      // Fetch messages in batches of 100 (Discord limit)
      while (hasMore) {
        try {
          const options = { limit: 100 };
          if (lastMessageId) {
            options.before = lastMessageId;
          }
          
          const messages = await channel.messages.fetch(options);
          
          if (messages.size === 0) {
            hasMore = false;
            break;
          }
          
          messagesChecked += messages.size;
          
          // Filter the user's messages
          const userMessages = messages.filter(msg => msg.author.id === userId);
          
          if (userMessages.size > 0) {
            const messagesToDelete = Array.from(userMessages.values());
            
            // Separate recent messages (bulk delete) and old ones (individual delete)
            const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp >= fourteenDaysAgo);
            const oldMessages = messagesToDelete.filter(msg => msg.createdTimestamp < fourteenDaysAgo);
            
            // Delete recent messages in batch (faster)
            if (recentMessages.length > 0) {
              // bulkDelete nécessite un tableau d'IDs de messages
              const recentMessageIds = recentMessages.map(msg => msg.id);
              
              // Discord limite bulkDelete à 100 messages et 14 jours
              for (let i = 0; i < recentMessageIds.length; i += 100) {
                const batch = recentMessageIds.slice(i, i + 100);
                
                try {
                  const deleted = await channel.bulkDelete(batch, true);
                  channelDeleted += deleted.size;
                  console.log(`    ✓ ${deleted.size} recent message(s) deleted in batch in #${channel.name}`);
                } catch (error) {
                  console.error(`    ⚠️ bulkDelete error in #${channel.name}:`, error.message);
                  // If bulkDelete fails, try to delete individually
                  for (const msgId of batch) {
                    try {
                      const msg = recentMessages.find(m => m.id === msgId);
                      if (msg) {
                        await msg.delete();
                        channelDeleted++;
                      }
                    } catch (err) {
                      // Ignore individual errors
                    }
                  }
                }
                
                // Pause to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            // Delete old messages one by one (Discord limitation)
            if (oldMessages.length > 0) {
              console.log(`    📝 ${oldMessages.length} old message(s) to delete individually in #${channel.name}...`);
              for (const msg of oldMessages) {
                try {
                  await msg.delete();
                  channelDeleted++;
                  // Longer pause for old messages
                  await new Promise(resolve => setTimeout(resolve, 300));
                } catch (error) {
                  // Message may no longer exist or be undeletable
                  if (error.code !== 10008) { // Unknown Message
                    // Ignore other errors silently
                  }
                }
              }
            }
          }
          
          // Update lastMessageId for the next iteration
          if (messages.size < 100) {
            hasMore = false;
          } else {
            lastMessageId = messages.last().id;
          }
          
          // Pause between batches to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          // If rate limited, wait longer
          if (error.code === 429 || error.status === 429) {
            const retryAfter = error.retryAfter || error.retry_after || 5;
            console.log(`  ⏳ Rate limit reached in #${channel.name}, waiting ${retryAfter} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          } else {
            console.error(`  ⚠️ Error in #${channel.name}:`, error.message);
            hasMore = false;
          }
        }
      }
      
      totalDeleted += channelDeleted;
      
      if (channelDeleted > 0) {
        console.log(`  ✓ #${channel.name}: ${channelDeleted} message(s) deleted (${messagesChecked} checked)`);
      } else if (messagesChecked > 0) {
        console.log(`  ℹ️ #${channel.name}: No messages found (${messagesChecked} checked)`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing channel ${channel.name}:`, error.message);
    }
  }
  
  return totalDeleted;
}

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  
  async execute(member) {
    try {
      // Check if captcha is enabled and if the user completed it
      const captchaConfig = await pool.query(
        'SELECT * FROM captcha_config WHERE guild_id = $1',
        [member.guild.id]
      );

      let captchaVerified = true; // Par défaut, considérer comme vérifié si captcha désactivé
      let captchaMessageId = null;
      let captchaChannelId = null;

      // If captcha enabled, check if the user completed it
      if (captchaConfig.rows.length > 0 && captchaConfig.rows[0].enabled) {
        const config = captchaConfig.rows[0];
        const guildMemberAddEvent = require('./guildMemberAdd');
        const pendingVerifications = guildMemberAddEvent.pendingVerifications;
        
        // Check if the user is still pending verification
        let foundInPending = false;
        for (const [verificationId, verification] of pendingVerifications.entries()) {
          if (verification.memberId === member.id && verification.guildId === member.guild.id) {
            // User still pending = not verified
            foundInPending = true;
            captchaVerified = false;
            captchaMessageId = verification.messageId;
            captchaChannelId = verification.channelId;
            // Remove from the map
            pendingVerifications.delete(verificationId);
            break;
          }
        }
        
        // If not pending, check by role (if configured)
        if (!foundInPending && config.role_id) {
          try {
            // Try to fetch the member before they leave
            const memberWithRoles = await member.guild.members.fetch(member.id).catch(() => null);
            
            if (memberWithRoles) {
              // If we can fetch the member, check the role
              captchaVerified = memberWithRoles.roles.cache.has(config.role_id);
            } else {
              // If we cannot fetch the member and they are not in pendingVerifications,
              // assume captcha was completed (removed from pending after verification)
              captchaVerified = true;
            }
          } catch (error) {
            console.error('Error during captcha check:', error);
            // If error but not in pendingVerifications, consider as verified
            captchaVerified = true;
          }
        } else if (!foundInPending) {
          // No role configured and not pending = verified
          captchaVerified = true;
        }
      }

      // Delete captcha message if exists
      if (captchaMessageId && captchaChannelId) {
        try {
          const channel = member.guild.channels.cache.get(captchaChannelId);
          if (channel) {
            const message = await channel.messages.fetch(captchaMessageId).catch(() => null);
            if (message) {
              await message.delete().catch(() => {});
              console.log(`🗑️ Captcha message deleted for ${member.user.tag}`);
            }
          }
        } catch (error) {
          console.error('Error while deleting captcha message:', error);
        }
      }

      // If captcha enabled and user didn't complete it, do not delete messages
      if (captchaConfig.rows.length > 0 && captchaConfig.rows[0].enabled && !captchaVerified) {
        console.log(`⚠️ ${member.user.tag} left ${member.guild.name} without completing captcha. Messages not deleted.`);
        
        // Log to a channel if configured
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (logChannelId) {
          const logChannel = member.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle('👋 Member left (not verified)')
              .setDescription(`${member.user.tag} left the server without completing captcha.`)
              .addFields(
                { name: '👤 User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                { name: '🔐 Status', value: '❌ Captcha not completed', inline: true },
                { name: '🗑️ Messages', value: 'Not deleted (captcha not completed)', inline: true }
              )
              .setColor(0xFFA500)
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();
            
            await logChannel.send({ embeds: [embed] }).catch(() => {});
          }
        }
        
        return; // Ne pas supprimer les messages
      }

      console.log(`👋 ${member.user.tag} left ${member.guild.name}. Deleting their messages...`);
      
      const deletedCount = await deleteUserMessages(member);
      
      // Log to a channel if configured
      const logChannelId = process.env.LOG_CHANNEL_ID;
      if (logChannelId) {
        const logChannel = member.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle('👋 Member left')
            .setDescription(`${member.user.tag} left the server.`)
            .addFields(
              { name: '👤 User', value: `${member.user.tag} (${member.user.id})`, inline: true },
              { name: '🗑️ Messages deleted', value: `${deletedCount} message(s)`, inline: true }
            )
            .setColor(0xFFA500)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
          
          await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }
      
      if (deletedCount > 0) {
        console.log(`✓ ${deletedCount} message(s) deleted for ${member.user.tag}`);
      } else {
        console.log(`ℹ️ No messages deleted for ${member.user.tag}`);
      }
    } catch (error) {
      console.error('❌ Error while deleting messages:', error);
      console.error('Stack:', error.stack);
      
      // Automatically report the error to the developer
      await reportInternalError(member.client, error, {
        commandName: 'guildMemberRemove Event (deleteUserMessages)',
        user: member.user,
        guild: member.guild,
        channel: null
      });
    }
  }
};
