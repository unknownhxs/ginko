const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder } = require('discord.js');
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
        console.error(`No matching command found for ${interaction.commandName}`);
        return;
      }
      
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error('❌ Error in command:', error);
        
        // Send error report to developer
        const commandInfo = {
          commandName: interaction.commandName,
          user: interaction.user,
          guild: interaction.guild,
          channel: interaction.channel
        };
        reportInternalError(interaction.client, error, commandInfo).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: '❌ An error occurred while executing this command!',
            ephemeral: true 
          }).catch(console.error);
        } else {
          await interaction.reply({ 
            content: '❌ An error occurred while executing this command!',
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
            content: '❌ This verification has expired or no longer exists.',
            ephemeral: true
          });
        }

        // Vérifier que c'est le bon utilisateur
        if (interaction.user.id !== verification.memberId) {
          return await interaction.reply({
            content: "❌ This verification button isn't for you.",
            ephemeral: true
          });
        }

        // Récupérer le membre
        const guild = interaction.guild;
        const member = await guild.members.fetch(verification.memberId).catch(() => null);

        if (!member) {
          return await interaction.reply({
            content: '❌ Unable to find your account on this server.',
            ephemeral: true
          });
        }

        // Donner le rôle si configuré
        if (verification.roleId) {
          try {
            const role = guild.roles.cache.get(verification.roleId);
            if (role) {
              await member.roles.add(role, 'Captcha verification passed');
            }
          } catch (error) {
            console.error('Error while adding role:', error);
          }
        }

        // Répondre à l'interaction d'abord
        await interaction.reply({
          content: '✅ Your account has been verified successfully!',
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
            console.error('Error while deleting captcha message:', error);
          }
        }

        // Supprimer la vérification de la map
        pendingVerifications.delete(verificationId);

        console.log(`✅ ${member.user.tag} completed captcha verification in ${guild.name}`);

        // Envoyer un message de bienvenue en MP
        try {
          const welcomeDM = new EmbedBuilder()
            .setTitle(`Welcome to ${guild.name}!`)
            .setDescription(`Your account has been verified.\n\n` +
                           `You can now access all channels on the server.`)
            .setColor(0x57F287)
            .setThumbnail(guild.iconURL())
            .setTimestamp();

          await member.send({ embeds: [welcomeDM] });
        } catch (error) {
          // L'utilisateur a peut-être désactivé les messages privés
        }

      } catch (error) {
        console.error('❌ Error during captcha verification:', error);
        
        // Send error report to developer
        reportInternalError(interaction.client, error).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ An error occurred during verification. Please try again.',
            ephemeral: true
          }).catch(console.error);
        } else {
          await interaction.reply({
            content: '❌ An error occurred during verification. Please try again.',
            ephemeral: true
          }).catch(console.error);
        }
      }
      return;
    }

    // Handle blacklist user button
    if (interaction.isButton() && interaction.customId.startsWith('blacklist_')) {
      try {
        // Check if user is the developer
        if (interaction.user.id !== '1368556179600445531') {
          return await interaction.reply({
            content: '❌ You do not have permission to use this button.',
            ephemeral: true
          });
        }

        const userId = interaction.customId.replace('blacklist_', '');
        const { pool } = require('../../config/config');

        // Check if user is already blacklisted
        const checkResult = await pool.query(
          'SELECT * FROM blacklist_id WHERE user_id = $1',
          [userId]
        );

        if (checkResult.rows.length > 0) {
          return await interaction.reply({
            content: '⚠️ This user is already blacklisted.',
            ephemeral: true
          });
        }

        // Add user to blacklist
        await pool.query(
          'INSERT INTO blacklist_id (guild_id, user_id, reason, added_by, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
          [interaction.guildId, userId, 'Blacklisted via report button', interaction.user.id]
        );

        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const userName = user ? user.tag : userId;

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ User Blacklisted')
          .setDescription(`User ${userName} has been added to the blacklist.`)
          .setColor(0x57F287)
          .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        console.log(`🚫 User ${userName} (${userId}) has been blacklisted by ${interaction.user.tag}`);

      } catch (error) {
        console.error('❌ Error blacklisting user:', error);
        
        reportInternalError(interaction.client, error).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ An error occurred while blacklisting the user.',
            ephemeral: true
          }).catch(console.error);
        } else {
          await interaction.reply({
            content: '❌ An error occurred while blacklisting the user.',
            ephemeral: true
          }).catch(console.error);
        }
      }
      return;
    }

    // Handle settings menu
    if (interaction.isStringSelectMenu() && interaction.customId === 'settings_menu') {
      try {
        const selectedValue = interaction.values[0];
        const { pool } = require('../../config/config');

        if (selectedValue === 'captcha_settings') {
          // Fetch current captcha config
          const captchaConfig = await pool.query(
            'SELECT * FROM captcha_config WHERE guild_id = $1',
            [interaction.guildId]
          );

          const config = captchaConfig.rows[0] || {};
          const configChannel = config.channel_id 
            ? interaction.guild.channels.cache.get(config.channel_id) 
            : null;
          const configRole = config.role_id 
            ? interaction.guild.roles.cache.get(config.role_id) 
            : null;

          const embed = new EmbedBuilder()
            .setTitle('🔐 Captcha Settings')
            .setDescription('Configure the captcha verification system')
            .addFields(
              { 
                name: '📌 Current Status', 
                value: config.enabled ? '✅ **Enabled**' : '❌ **Disabled**', 
                inline: true 
              },
              { 
                name: '📝 Channel', 
                value: configChannel ? `${configChannel}` : '**Default**', 
                inline: true 
              },
              { 
                name: '🎭 Verification Role', 
                value: configRole ? `${configRole}` : '**None**', 
                inline: true 
              },
              { 
                name: '⏰ Timeout', 
                value: config.timeout_minutes > 0 ? `**${config.timeout_minutes} minutes**` : '**Disabled**', 
                inline: true 
              }
            )
            .setColor(0x5865F2)
            .setTimestamp();

          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setLabel(config.enabled ? 'Disable Captcha' : 'Enable Captcha')
                .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setCustomId('captcha_toggle')
            );

          const channelRow = new ActionRowBuilder()
            .addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId('captcha_channel_select')
                .setPlaceholder('Select captcha channel...')
            );

          const roleRow = new ActionRowBuilder()
            .addComponents(
              new RoleSelectMenuBuilder()
                .setCustomId('captcha_role_select')
                .setPlaceholder('Select verification role...')
            );

          const timeoutRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setLabel('Set Timeout')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('captcha_timeout')
            );

          await interaction.update({
            embeds: [embed],
            components: [row, channelRow, roleRow, timeoutRow],
            ephemeral: true
          });
        }

      } catch (error) {
        console.error('❌ Error in settings menu:', error);
        reportInternalError(interaction.client, error).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ An error occurred.',
            ephemeral: true
          }).catch(console.error);
        }
      }
      return;
    }

    // Handle captcha toggle button
    if (interaction.isButton() && interaction.customId === 'captcha_toggle') {
      try {
        const { pool } = require('../../config/config');

        let captchaConfig = await pool.query(
          'SELECT * FROM captcha_config WHERE guild_id = $1',
          [interaction.guildId]
        );

        let config = captchaConfig.rows[0];

        if (!config) {
          // Create new config
          await pool.query(
            'INSERT INTO captcha_config (guild_id, enabled, timeout_minutes, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
            [interaction.guildId, true, 10]
          );
          config = { enabled: true };
        } else {
          // Toggle enabled status
          const newStatus = !config.enabled;
          await pool.query(
            'UPDATE captcha_config SET enabled = $1, updated_at = NOW() WHERE guild_id = $2',
            [newStatus, interaction.guildId]
          );
          config.enabled = newStatus;
        }

        const statusEmbed = new EmbedBuilder()
          .setTitle('✅ Captcha Status Updated')
          .setDescription(`Captcha is now **${config.enabled ? '✅ Enabled' : '❌ Disabled'}**`)
          .setColor(config.enabled ? 0x57F287 : 0xED4245)
          .setTimestamp();

        await interaction.reply({ embeds: [statusEmbed], ephemeral: true });

      } catch (error) {
        console.error('❌ Error toggling captcha:', error);
        reportInternalError(interaction.client, error).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '❌ Error updating settings.', ephemeral: true }).catch(console.error);
        } else {
          await interaction.reply({ content: '❌ Error updating settings.', ephemeral: true }).catch(console.error);
        }
      }
      return;
    }

    // Handle captcha channel select
    if (interaction.isChannelSelectMenu() && interaction.customId === 'captcha_channel_select') {
      try {
        const { pool } = require('../../config/config');
        const selectedChannel = interaction.values[0];

        await pool.query(
          'UPDATE captcha_config SET channel_id = $1, updated_at = NOW() WHERE guild_id = $2',
          [selectedChannel, interaction.guildId]
        );

        const channel = interaction.guild.channels.cache.get(selectedChannel);
        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Channel Updated')
          .setDescription(`Captcha channel set to ${channel}`)
          .setColor(0x57F287)
          .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      } catch (error) {
        console.error('❌ Error updating channel:', error);
        reportInternalError(interaction.client, error).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '❌ Error updating channel.', ephemeral: true }).catch(console.error);
        } else {
          await interaction.reply({ content: '❌ Error updating channel.', ephemeral: true }).catch(console.error);
        }
      }
      return;
    }

    // Handle captcha role select
    if (interaction.isRoleSelectMenu() && interaction.customId === 'captcha_role_select') {
      try {
        const { pool } = require('../../config/config');
        const selectedRole = interaction.values[0];

        await pool.query(
          'UPDATE captcha_config SET role_id = $1, updated_at = NOW() WHERE guild_id = $2',
          [selectedRole, interaction.guildId]
        );

        const role = interaction.guild.roles.cache.get(selectedRole);
        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Role Updated')
          .setDescription(`Verification role set to ${role}`)
          .setColor(0x57F287)
          .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      } catch (error) {
        console.error('❌ Error updating role:', error);
        reportInternalError(interaction.client, error).catch(console.error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '❌ Error updating role.', ephemeral: true }).catch(console.error);
        } else {
          await interaction.reply({ content: '❌ Error updating role.', ephemeral: true }).catch(console.error);
        }
      }
      return;
    }
  }
};
