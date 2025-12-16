const { EmbedBuilder } = require('discord.js');
const guildMemberAddEvent = require('./guildMemberAdd');
const { reportInternalError } = require('../services/reportErrorService');

module.exports = {
  name: 'interactionCreate',
  once: false,
  
  async execute(interaction) {
    // Gérer les commandes slash
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`Aucune commande correspondante trouvée pour ${interaction.commandName}`);
        return;
      }
      
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error('❌ Erreur dans la commande:', error);
        
        // Envoyer le rapport d'erreur au développeur
        const commandInfo = {
          commandName: interaction.commandName,
          user: interaction.user,
          guild: interaction.guild,
          channel: interaction.channel
        };
        reportInternalError(interaction.client, error, commandInfo).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande!',
            ephemeral: true 
          }).catch(console.error);
        } else {
          await interaction.reply({ 
            content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande!',
            ephemeral: true 
          }).catch(console.error);
        }
      }
      return;
    }

    // Gérer les boutons de vérification captcha
    if (interaction.isButton() && interaction.customId.startsWith('verify_')) {
      try {
        const verificationId = interaction.customId.replace('verify_', '');
        const pendingVerifications = guildMemberAddEvent.pendingVerifications;
        const verification = pendingVerifications.get(verificationId);

        if (!verification) {
          return await interaction.reply({
            content: '❌ Cette vérification a expiré ou n\'existe plus.',
            ephemeral: true
          });
        }

        // Vérifier que c'est le bon utilisateur
        if (interaction.user.id !== verification.memberId) {
          return await interaction.reply({
            content: '❌ Ce bouton de vérification ne vous est pas destiné.',
            ephemeral: true
          });
        }

        // Récupérer le membre
        const guild = interaction.guild;
        const member = await guild.members.fetch(verification.memberId).catch(() => null);

        if (!member) {
          return await interaction.reply({
            content: '❌ Impossible de trouver votre compte sur ce serveur.',
            ephemeral: true
          });
        }

        // Donner le rôle si configuré
        if (verification.roleId) {
          try {
            const role = guild.roles.cache.get(verification.roleId);
            if (role) {
              await member.roles.add(role, 'Vérification captcha réussie');
            }
          } catch (error) {
            console.error('Erreur lors de l\'ajout du rôle:', error);
          }
        }

        // Répondre à l'interaction d'abord
        await interaction.reply({
          content: '✅ Votre compte a été vérifié avec succès!',
          ephemeral: true
        });

        // Supprimer le message de captcha après avoir répondu
        if (verification.messageId && verification.channelId) {
          try {
            // Attendre un peu pour que la réponse soit traitée
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const channel = guild.channels.cache.get(verification.channelId);
            if (channel) {
              const captchaMessage = await channel.messages.fetch(verification.messageId).catch(() => null);
              if (captchaMessage) {
                await captchaMessage.delete().catch(() => {});
                console.log(`🗑️ Message de captcha supprimé après vérification pour ${member.user.tag}`);
              }
            }
          } catch (error) {
            console.error('Erreur lors de la suppression du message de captcha:', error);
          }
        }

        // Supprimer la vérification de la map
        pendingVerifications.delete(verificationId);

        console.log(`✅ ${member.user.tag} a complété la vérification captcha dans ${guild.name}`);

        // Envoyer un message de bienvenue en MP
        try {
          const welcomeDM = new EmbedBuilder()
            .setTitle(`Bienvenue sur ${guild.name}!`)
            .setDescription(`Votre compte a été vérifié avec succès.\n\n` +
                           `Vous pouvez maintenant accéder à tous les canaux du serveur.`)
            .setColor(0x57F287)
            .setThumbnail(guild.iconURL())
            .setTimestamp();

          await member.send({ embeds: [welcomeDM] });
        } catch (error) {
          // L'utilisateur a peut-être désactivé les messages privés
        }

      } catch (error) {
        console.error('❌ Erreur lors de la vérification captcha:', error);
        
        // Envoyer le rapport d'erreur au développeur
        reportInternalError(interaction.client, error).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ Une erreur s\'est produite lors de la vérification. Veuillez réessayer.',
            ephemeral: true
          }).catch(console.error);
        } else {
          await interaction.reply({
            content: '❌ Une erreur s\'est produite lors de la vérification. Veuillez réessayer.',
            ephemeral: true
          }).catch(console.error);
        }
      }
      return;
    }
  }
};
