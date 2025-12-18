const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../../config/config');
const { reportInternalError } = require('../services/reportErrorService');

// Store users pending verification
const pendingVerifications = new Map();

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  
  async execute(member) {
    try {
      // Fetch captcha configuration
      const config = await pool.query(
        'SELECT * FROM captcha_config WHERE guild_id = $1',
        [member.guild.id]
      );

      if (config.rows.length === 0 || !config.rows[0].enabled) {
        // Captcha disabled, nothing to do
        return;
      }

      const captchaConfig = config.rows[0];
      
      // Compute timeout based on server verification level
      const verificationLevel = member.guild.verificationLevel;
      let actualTimeout = parseInt(captchaConfig.timeout_minutes) || 0;
      
      // HIGH = 3, VERY_HIGH = 4 - If high security, add 10 minutes to timeout
      if (verificationLevel >= 3 && actualTimeout > 0) {
        actualTimeout = actualTimeout + 10;
      }
      
      // Determine the channel to send the captcha to
      let targetChannel = null;
      if (captchaConfig.channel_id) {
        targetChannel = member.guild.channels.cache.get(captchaConfig.channel_id);
      }
      
      // If no specific channel, use a welcome-like channel
      if (!targetChannel) {
        // Search for a channel named "welcome", "general" (keep French aliases too for compatibility)
        const welcomeChannels = member.guild.channels.cache.filter(channel => 
          channel.isTextBased() && 
          ['bienvenue', 'welcome', 'général', 'general', 'accueil'].some(name => 
            channel.name.toLowerCase().includes(name)
          )
        );
        
        if (welcomeChannels.size > 0) {
          targetChannel = welcomeChannels.first();
        } else {
          // Utiliser le premier canal textuel accessible
          targetChannel = member.guild.channels.cache
            .filter(ch => ch.isTextBased() && ch.permissionsFor(member.guild.members.me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]))
            .first();
        }
      }

      if (!targetChannel) {
        console.error(`⚠️ Impossible de trouver un canal pour le captcha dans ${member.guild.name}`);
        return;
      }

      // Generate random verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationId = `${member.id}-${Date.now()}`;
      
      // Store the pending verification (without the message for now)
      pendingVerifications.set(verificationId, {
        memberId: member.id,
        guildId: member.guild.id,
        code: verificationCode,
        timestamp: Date.now(),
        roleId: captchaConfig.role_id,
        timeoutMinutes: actualTimeout,
        messageId: null, // Will be set after sending
        channelId: targetChannel.id
      });

      // Compute wait time after verification (10 minutes if high security)
      const waitTime = verificationLevel >= 3 ? 10 : 0;
      
      // Create captcha embed
      const captchaEmbed = new EmbedBuilder()
        .setTitle('🔐 Verification required')
        .setDescription(`Welcome to **${member.guild.name}**, ${member.user}!\n\n` +
                       `To access the server, you must complete verification${waitTime > 0 ? ` and wait ${waitTime} minute(s)` : ''} before gaining access to all channels.\n\n` +
                       `**Click the button below to verify your account.**`)
        .setColor(0x5865F2)
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: `You have ${actualTimeout > 0 ? actualTimeout : '∞'} minute(s) to verify` })
        .setTimestamp();

      // Create the verification button
      const verifyButton = new ButtonBuilder()
        .setCustomId(`verify_${verificationId}`)
        .setLabel('✅ Verify my account')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder()
        .addComponents(verifyButton);

      // Send the captcha message
      const captchaMessage = await targetChannel.send({
        content: `${member.user}`,
        embeds: [captchaEmbed],
        components: [row]
      });

      // Update verification with the message ID
      const verification = pendingVerifications.get(verificationId);
      if (verification) {
        verification.messageId = captchaMessage.id;
        pendingVerifications.set(verificationId, verification);
      }

      // Schedule the kick if timeout is enabled
      if (actualTimeout > 0) {
        setTimeout(async () => {
          const verification = pendingVerifications.get(verificationId);
          if (verification && verification.memberId === member.id) {
            // The user wasn't verified, kick them
            try {
              const memberToKick = await member.guild.members.fetch(member.id).catch(() => null);
              if (memberToKick) {
                await memberToKick.send({
                  content: `⏰ You have been kicked from **${member.guild.name}** because you did not complete verification in time.`
                }).catch(() => {});
                
                await memberToKick.kick('Captcha verification timeout');
                console.log(`⏰ ${member.user.tag} kicked due to captcha timeout`);
              }
            } catch (error) {
              console.error(`Error kicking due to timeout:`, error);
            }
            
            // Delete the captcha message
            try {
              await captchaMessage.delete().catch(() => {});
            } catch (error) {
              // Ignore delete errors
            }
            
            pendingVerifications.delete(verificationId);
          }
        }, actualTimeout * 60 * 1000);
      }

      console.log(`🔐 Captcha sent to ${member.user.tag} in ${member.guild.name}`);

    } catch (error) {
      console.error('Error while sending captcha:', error);
      
      // Automatically report the error to the developer
      await reportInternalError(member.client, error, {
        commandName: 'guildMemberAdd Event',
        user: member.user,
        guild: member.guild,
        channel: null
      });
    }
  }
};

// Export the map for the button handler
module.exports.pendingVerifications = pendingVerifications;
