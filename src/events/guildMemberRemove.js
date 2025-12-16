const { EmbedBuilder, ChannelType } = require('discord.js');
const { pool } = require('../../config/config');
const { reportInternalError } = require('../services/reportErrorService');

// Fonction pour supprimer les messages d'un utilisateur
async function deleteUserMessages(member) {
  let totalDeleted = 0;
  const userId = member.user.id;
  const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
  
  // Parcourir tous les canaux textuels du serveur
  const textChannels = member.guild.channels.cache.filter(
    channel => channel.isTextBased() && channel.type !== ChannelType.DM
  );
  
  console.log(`  🔍 Recherche dans ${textChannels.size} canal(x)...`);
  
  for (const channel of textChannels.values()) {
    try {
      // Vérifier les permissions du bot
      const botMember = member.guild.members.me;
      if (!botMember) {
        console.log(`  ⚠️ Bot membre non trouvé pour ${channel.name}`);
        continue;
      }
      
      const permissions = channel.permissionsFor(botMember);
      if (!permissions?.has(['ViewChannel', 'ManageMessages', 'ReadMessageHistory'])) {
        console.log(`  ⚠️ Permissions insuffisantes dans #${channel.name}`);
        continue;
      }
      
      let hasMore = true;
      let lastMessageId = null;
      let channelDeleted = 0;
      let messagesChecked = 0;
      
      // Parcourir les messages par batch de 100 (limite Discord)
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
          
          // Filtrer les messages de l'utilisateur
          const userMessages = messages.filter(msg => msg.author.id === userId);
          
          if (userMessages.size > 0) {
            const messagesToDelete = Array.from(userMessages.values());
            
            // Séparer les messages récents (bulk delete) et anciens (delete individuel)
            const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp >= fourteenDaysAgo);
            const oldMessages = messagesToDelete.filter(msg => msg.createdTimestamp < fourteenDaysAgo);
            
            // Supprimer les messages récents en batch (plus rapide)
            if (recentMessages.length > 0) {
              // bulkDelete nécessite un tableau d'IDs de messages
              const recentMessageIds = recentMessages.map(msg => msg.id);
              
              // Discord limite bulkDelete à 100 messages et 14 jours
              for (let i = 0; i < recentMessageIds.length; i += 100) {
                const batch = recentMessageIds.slice(i, i + 100);
                
                try {
                  const deleted = await channel.bulkDelete(batch, true);
                  channelDeleted += deleted.size;
                  console.log(`    ✓ ${deleted.size} message(s) récent(s) supprimé(s) en batch dans #${channel.name}`);
                } catch (error) {
                  console.error(`    ⚠️ Erreur bulkDelete dans #${channel.name}:`, error.message);
                  // Si bulkDelete échoue, essayer de supprimer individuellement
                  for (const msgId of batch) {
                    try {
                      const msg = recentMessages.find(m => m.id === msgId);
                      if (msg) {
                        await msg.delete();
                        channelDeleted++;
                      }
                    } catch (err) {
                      // Ignorer les erreurs individuelles
                    }
                  }
                }
                
                // Pause pour éviter le rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            // Supprimer les messages anciens un par un (limite Discord)
            if (oldMessages.length > 0) {
              console.log(`    📝 ${oldMessages.length} message(s) ancien(s) à supprimer individuellement dans #${channel.name}...`);
              for (const msg of oldMessages) {
                try {
                  await msg.delete();
                  channelDeleted++;
                  // Pause plus longue pour les messages anciens
                  await new Promise(resolve => setTimeout(resolve, 300));
                } catch (error) {
                  // Message peut ne plus exister ou ne pas être supprimable
                  if (error.code !== 10008) { // Unknown Message
                    // Ignorer les autres erreurs silencieusement
                  }
                }
              }
            }
          }
          
          // Mettre à jour lastMessageId pour la prochaine itération
          if (messages.size < 100) {
            hasMore = false;
          } else {
            lastMessageId = messages.last().id;
          }
          
          // Pause entre les batches pour éviter le rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          // Si erreur de rate limit, attendre plus longtemps
          if (error.code === 429 || error.status === 429) {
            const retryAfter = error.retryAfter || error.retry_after || 5;
            console.log(`  ⏳ Rate limit atteint dans #${channel.name}, attente de ${retryAfter} secondes...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          } else {
            console.error(`  ⚠️ Erreur dans #${channel.name}:`, error.message);
            hasMore = false;
          }
        }
      }
      
      totalDeleted += channelDeleted;
      
      if (channelDeleted > 0) {
        console.log(`  ✓ #${channel.name}: ${channelDeleted} message(s) supprimé(s) (${messagesChecked} vérifié(s))`);
      } else if (messagesChecked > 0) {
        console.log(`  ℹ️ #${channel.name}: Aucun message trouvé (${messagesChecked} vérifié(s))`);
      }
      
    } catch (error) {
      console.error(`  ❌ Erreur lors du traitement du canal ${channel.name}:`, error.message);
    }
  }
  
  return totalDeleted;
}

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  
  async execute(member) {
    try {
      // Vérifier si le captcha est activé et si l'utilisateur l'a complété
      const captchaConfig = await pool.query(
        'SELECT * FROM captcha_config WHERE guild_id = $1',
        [member.guild.id]
      );

      let captchaVerified = true; // Par défaut, considérer comme vérifié si captcha désactivé
      let captchaMessageId = null;
      let captchaChannelId = null;

      // Si le captcha est activé, vérifier si l'utilisateur l'a complété
      if (captchaConfig.rows.length > 0 && captchaConfig.rows[0].enabled) {
        const config = captchaConfig.rows[0];
        const guildMemberAddEvent = require('./guildMemberAdd');
        const pendingVerifications = guildMemberAddEvent.pendingVerifications;
        
        // Vérifier si l'utilisateur est encore dans les vérifications en attente
        let foundInPending = false;
        for (const [verificationId, verification] of pendingVerifications.entries()) {
          if (verification.memberId === member.id && verification.guildId === member.guild.id) {
            // L'utilisateur est encore en attente de vérification = non vérifié
            foundInPending = true;
            captchaVerified = false;
            captchaMessageId = verification.messageId;
            captchaChannelId = verification.channelId;
            // Supprimer de la map
            pendingVerifications.delete(verificationId);
            break;
          }
        }
        
        // Si pas trouvé dans pendingVerifications, vérifier avec le rôle (si configuré)
        if (!foundInPending && config.role_id) {
          try {
            // Essayer de récupérer le membre avant qu'il ne quitte
            const memberWithRoles = await member.guild.members.fetch(member.id).catch(() => null);
            
            if (memberWithRoles) {
              // Si on peut récupérer le membre, vérifier le rôle
              captchaVerified = memberWithRoles.roles.cache.has(config.role_id);
            } else {
              // Si on ne peut pas récupérer le membre, mais qu'il n'est pas dans pendingVerifications,
              // c'est qu'il a complété le captcha (car il a été supprimé de pendingVerifications après vérification)
              captchaVerified = true;
            }
          } catch (error) {
            console.error('Erreur lors de la vérification du captcha:', error);
            // Si erreur mais pas dans pendingVerifications, considérer comme vérifié
            captchaVerified = true;
          }
        } else if (!foundInPending) {
          // Pas de rôle configuré et pas dans pendingVerifications = vérifié
          captchaVerified = true;
        }
      }

      // Supprimer le message de captcha s'il existe
      if (captchaMessageId && captchaChannelId) {
        try {
          const channel = member.guild.channels.cache.get(captchaChannelId);
          if (channel) {
            const message = await channel.messages.fetch(captchaMessageId).catch(() => null);
            if (message) {
              await message.delete().catch(() => {});
              console.log(`🗑️ Message de captcha supprimé pour ${member.user.tag}`);
            }
          }
        } catch (error) {
          console.error('Erreur lors de la suppression du message de captcha:', error);
        }
      }

      // Si le captcha est activé et que l'utilisateur ne l'a pas complété, ne pas supprimer les messages
      if (captchaConfig.rows.length > 0 && captchaConfig.rows[0].enabled && !captchaVerified) {
        console.log(`⚠️ ${member.user.tag} a quitté le serveur ${member.guild.name} sans avoir complété le captcha. Messages non supprimés.`);
        
        // Log dans un canal si configuré
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (logChannelId) {
          const logChannel = member.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle('👋 Membre parti (non vérifié)')
              .setDescription(`${member.user.tag} a quitté le serveur sans avoir complété le captcha.`)
              .addFields(
                { name: '👤 Utilisateur', value: `${member.user.tag} (${member.user.id})`, inline: true },
                { name: '🔐 Statut', value: '❌ Captcha non complété', inline: true },
                { name: '🗑️ Messages', value: 'Non supprimés (captcha non complété)', inline: true }
              )
              .setColor(0xFFA500)
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();
            
            await logChannel.send({ embeds: [embed] }).catch(() => {});
          }
        }
        
        return; // Ne pas supprimer les messages
      }

      console.log(`👋 ${member.user.tag} a quitté le serveur ${member.guild.name}. Suppression de ses messages...`);
      
      const deletedCount = await deleteUserMessages(member);
      
      // Log dans un canal si configuré
      const logChannelId = process.env.LOG_CHANNEL_ID;
      if (logChannelId) {
        const logChannel = member.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle('👋 Membre parti')
            .setDescription(`${member.user.tag} a quitté le serveur.`)
            .addFields(
              { name: '👤 Utilisateur', value: `${member.user.tag} (${member.user.id})`, inline: true },
              { name: '🗑️ Messages supprimés', value: `${deletedCount} message(s)`, inline: true }
            )
            .setColor(0xFFA500)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
          
          await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }
      
      if (deletedCount > 0) {
        console.log(`✓ ${deletedCount} message(s) supprimé(s) pour ${member.user.tag}`);
      } else {
        console.log(`ℹ️ Aucun message supprimé pour ${member.user.tag}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des messages:', error);
      console.error('Stack:', error.stack);
      
      // Signaler l'erreur automatiquement au développeur
      await reportInternalError(member.client, error, {
        commandName: 'guildMemberRemove Event (deleteUserMessages)',
        user: member.user,
        guild: member.guild,
        channel: null
      });
    }
  }
};
