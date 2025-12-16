const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../../config/config');
const { reportInternalError } = require('../services/reportErrorService');

// Stocker les utilisateurs en attente de vérification
const pendingVerifications = new Map();

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  
  async execute(member) {
    try {
      // Récupérer la configuration du captcha
      const config = await pool.query(
        'SELECT * FROM captcha_config WHERE guild_id = $1',
        [member.guild.id]
      );

      if (config.rows.length === 0 || !config.rows[0].enabled) {
        // Captcha désactivé, rien à faire
        return;
      }

      const captchaConfig = config.rows[0];
      
      // Calculer le timeout en fonction du niveau de sécurité du serveur
      const verificationLevel = member.guild.verificationLevel;
      let actualTimeout = parseInt(captchaConfig.timeout_minutes) || 0;
      
      // HIGH = 3, VERY_HIGH = 4 - Si sécurité haute, ajouter 10 minutes au timeout
      if (verificationLevel >= 3 && actualTimeout > 0) {
        actualTimeout = actualTimeout + 10;
      }
      
      // Déterminer le canal où envoyer le captcha
      let targetChannel = null;
      if (captchaConfig.channel_id) {
        targetChannel = member.guild.channels.cache.get(captchaConfig.channel_id);
      }
      
      // Si pas de canal spécifique, utiliser le canal système de bienvenue
      if (!targetChannel) {
        // Chercher un canal nommé "bienvenue", "welcome", "général", ou "general"
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

      // Générer un code de vérification aléatoire
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationId = `${member.id}-${Date.now()}`;
      
      // Stocker la vérification en attente (sans le message pour l'instant)
      pendingVerifications.set(verificationId, {
        memberId: member.id,
        guildId: member.guild.id,
        code: verificationCode,
        timestamp: Date.now(),
        roleId: captchaConfig.role_id,
        timeoutMinutes: actualTimeout,
        messageId: null, // Sera mis à jour après l'envoi
        channelId: targetChannel.id
      });

      // Calculer le temps d'attente après vérification (10 minutes si sécurité haute)
      const waitTime = verificationLevel >= 3 ? 10 : 0;
      
      // Créer l'embed de captcha
      const captchaEmbed = new EmbedBuilder()
        .setTitle('🔐 Vérification requise')
        .setDescription(`Bienvenue sur **${member.guild.name}**, ${member.user}!\n\n` +
                       `Pour accéder au serveur, vous devez compléter la vérification${waitTime > 0 ? ` et attendre ${waitTime} minute(s)` : ''} avant de pouvoir accéder à tous les canaux.\n\n` +
                       `**Cliquez sur le bouton ci-dessous pour vérifier votre compte.**`)
        .setColor(0x5865F2)
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: `Vous avez ${actualTimeout > 0 ? actualTimeout : '∞'} minute(s) pour vous vérifier` })
        .setTimestamp();

      // Créer le bouton de vérification
      const verifyButton = new ButtonBuilder()
        .setCustomId(`verify_${verificationId}`)
        .setLabel('✅ Vérifier mon compte')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder()
        .addComponents(verifyButton);

      // Envoyer le message de captcha
      const captchaMessage = await targetChannel.send({
        content: `${member.user}`,
        embeds: [captchaEmbed],
        components: [row]
      });

      // Mettre à jour la vérification avec l'ID du message
      const verification = pendingVerifications.get(verificationId);
      if (verification) {
        verification.messageId = captchaMessage.id;
        pendingVerifications.set(verificationId, verification);
      }

      // Programmer l'expulsion si timeout activé
      if (actualTimeout > 0) {
        setTimeout(async () => {
          const verification = pendingVerifications.get(verificationId);
          if (verification && verification.memberId === member.id) {
            // L'utilisateur n'a pas été vérifié, l'expulser
            try {
              const memberToKick = await member.guild.members.fetch(member.id).catch(() => null);
              if (memberToKick) {
                await memberToKick.send({
                  content: `⏰ Vous avez été expulsé de **${member.guild.name}** car vous n'avez pas complété la vérification à temps.`
                }).catch(() => {});
                
                await memberToKick.kick('Timeout de vérification captcha');
                console.log(`⏰ ${member.user.tag} expulsé pour timeout de captcha`);
              }
            } catch (error) {
              console.error(`Erreur lors de l'expulsion pour timeout:`, error);
            }
            
            // Supprimer le message de captcha
            try {
              await captchaMessage.delete().catch(() => {});
            } catch (error) {
              // Ignorer les erreurs de suppression
            }
            
            pendingVerifications.delete(verificationId);
          }
        }, actualTimeout * 60 * 1000);
      }

      console.log(`🔐 Captcha envoyé à ${member.user.tag} dans ${member.guild.name}`);

    } catch (error) {
      console.error('Erreur lors de l\'envoi du captcha:', error);
      
      // Signaler l'erreur automatiquement au développeur
      await reportInternalError(member.client, error, {
        commandName: 'guildMemberAdd Event',
        user: member.user,
        guild: member.guild,
        channel: null
      });
    }
  }
};

// Exporter la map pour l'utiliser dans le gestionnaire de boutons
module.exports.pendingVerifications = pendingVerifications;
