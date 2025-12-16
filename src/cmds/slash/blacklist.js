const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const BlacklistIdService = require('../../services/blacklistIdService');
const BlacklistIpService = require('../../services/blacklistIpService');
const { reportInternalError } = require('../../services/reportErrorService');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage the blacklist for users and MAC addresses')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(group =>
      group
        .setName('id')
        .setDescription('Manage blacklist by user ID')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a user to the blacklist by ID')
            .addStringOption(option =>
              option
                .setName('user_id')
                .setDescription('The user ID to add')
                .setRequired(true))
            .addStringOption(option =>
              option
                .setName('reason')
                .setDescription('Reason for adding to the blacklist')
                .setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a user from the blacklist by ID')
            .addStringOption(option =>
              option
                .setName('user_id')
                .setDescription('The user ID to remove')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('update')
            .setDescription('Update a user reason in the blacklist')
            .addStringOption(option =>
              option
                .setName('user_id')
                .setDescription('The user ID to update')
                .setRequired(true))
            .addStringOption(option =>
              option
                .setName('reason')
                .setDescription('The new reason')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View information about a blacklisted user')
            .addStringOption(option =>
              option
                .setName('user_id')
                .setDescription('The user ID to view')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all blacklisted users')))
    .addSubcommandGroup(group =>
      group
        .setName('ip')
        .setDescription('Manage blacklist by MAC address')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a MAC address to the blacklist')
            .addStringOption(option =>
              option
                .setName('mac_address')
                .setDescription('The MAC address to add (format: XX:XX:XX:XX:XX:XX)')
                .setRequired(true))
            .addStringOption(option =>
              option
                .setName('reason')
                .setDescription('Reason for adding to the blacklist')
                .setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a MAC address from the blacklist')
            .addStringOption(option =>
              option
                .setName('mac_address')
                .setDescription('The MAC address to remove')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('update')
            .setDescription('Update a MAC address reason in the blacklist')
            .addStringOption(option =>
              option
                .setName('mac_address')
                .setDescription('The MAC address to update')
                .setRequired(true))
            .addStringOption(option =>
              option
                .setName('reason')
                .setDescription('The new reason')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View information about a blacklisted MAC address')
            .addStringOption(option =>
              option
                .setName('mac_address')
                .setDescription('The MAC address to view')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all blacklisted MAC addresses'))),
  
  async execute(interaction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    try {
      // Gestion de la liste noire par ID
      if (subcommandGroup === 'id') {
        await this.handleIdBlacklist(interaction, subcommand);
      }
      // Gestion de la liste noire par IP/MAC
      else if (subcommandGroup === 'ip') {
        await this.handleIpBlacklist(interaction, subcommand);
      }
    } catch (error) {
      console.error('Error while handling blacklist:', error);
      
      // Automatically report the error to the developer
      await reportInternalError(interaction.client, error, {
        commandName: 'blacklist',
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel
      });
      
      if (error.code === '42P01' || error.code === 'ER_NO_SUCH_TABLE') {
        const errorEmbed = new EmbedBuilder()
          .setTitle('⚠️ Configuration error')
          .setDescription('The database is not properly configured. Please run the initialization script.')
          .setColor(0xED4245);

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      await interaction.reply({
        content: '❌ An error occurred. Please try again later.',
        ephemeral: true
      });
    }
  },

  /**
   * Gérer les commandes de liste noire par ID
   */
  async handleIdBlacklist(interaction, subcommand) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason');

    // Validation pour toutes les commandes sauf list
    if (subcommand !== 'list') {
      if (!BlacklistIdService.validateUserId(userId)) {
        return await interaction.reply({
          content: '❌ Invalid user ID. A Discord ID must be 17–19 digits.',
          ephemeral: true
        });
      }
    }

    try {
      if (subcommand === 'add') {
        await BlacklistIdService.add(interaction.guild.id, userId, reason, interaction.user.id);

        const embed = this._makeEmbed({
          title: '✅ User added to blacklist',
          description: `User <@${userId}> has been blacklisted by ID.`,
          fields: [
            { name: '🆔 User ID', value: userId, inline: true },
            { name: '📝 Reason', value: reason || 'No reason specified', inline: false },
            { name: '👮 Added by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
          ],
          color: 0x57F287
        });

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'remove') {
        await BlacklistIdService.remove(userId);

        const embed = this._makeEmbed({
          title: '✅ User removed from blacklist',
          description: `User <@${userId}> has been removed from the blacklist (by ID).`,
          fields: [
            { name: '🆔 User ID', value: userId, inline: true },
            { name: '👮 Removed by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
          ],
          color: 0x57F287
        });

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'update') {
        await BlacklistIdService.update(userId, reason);

        const embed = this._makeEmbed({
          title: '✅ Reason updated',
          description: `The reason for <@${userId}> has been updated.`,
          fields: [
            { name: '🆔 User ID', value: userId, inline: true },
            { name: '📝 New reason', value: reason, inline: false },
            { name: '👮 Updated by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
          ],
          color: 0x57F287
        });

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'view') {
        const blacklistEntry = await BlacklistIdService.get(userId);
        const addedByUser = await interaction.client.users.fetch(blacklistEntry.added_by).catch(() => null);

        const embed = this._makeEmbed({
          title: '📋 Blacklist information (ID)',
          description: `Information about <@${userId}>`,
          fields: [
            { name: '🆔 User ID', value: userId, inline: true },
            { name: '📝 Reason', value: blacklistEntry.reason || 'No reason specified', inline: false },
            { name: '👮 Added by', value: addedByUser ? `${addedByUser.tag} (${blacklistEntry.added_by})` : `ID: ${blacklistEntry.added_by}`, inline: true },
            { name: '📅 Added at', value: this._formatDiscordTime(blacklistEntry.created_at), inline: true },
            { name: '🔄 Last update', value: this._formatDiscordTime(blacklistEntry.updated_at), inline: true }
          ]
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });

      } else if (subcommand === 'list') {
        const entries = await BlacklistIdService.list();

        if (entries.length === 0) {
          return await interaction.reply({
            content: '✅ No users in the ID blacklist.',
            ephemeral: true
          });
        }

        const embed = this._makeEmbed({
          title: '📋 Blacklisted users (ID)',
          description: `Total: ${entries.length} user(s)`
        });

        entries.forEach((entry, index) => {
          embed.addFields({
            name: `${index + 1}. ID: ${entry.user_id}`,
            value: `**Reason:** ${entry.reason || 'None'}\n**Added:** ${this._formatDiscordTimeRelative(entry.created_at)}`,
            inline: false
          });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      if (error.message === 'USER_ALREADY_BLACKLISTED') {
        return await interaction.reply({
          content: `❌ User <@${userId}> is already blacklisted.`,
          ephemeral: true
        });
      } else if (error.message === 'USER_NOT_FOUND') {
        return await interaction.reply({
          content: `❌ User <@${userId}> is not blacklisted.`,
          ephemeral: true
        });
      }
      throw error;
    }
  },

  /**
   * Gérer les commandes de liste noire par IP/MAC
   */
  async handleIpBlacklist(interaction, subcommand) {
    let macAddress = interaction.options.getString('mac_address');
    const reason = interaction.options.getString('reason');

    // Normaliser et valider pour toutes les commandes sauf list
    if (subcommand !== 'list') {
      macAddress = BlacklistIpService.normalizeMacAddress(macAddress);
      
      if (!BlacklistIpService.validateMacAddress(macAddress)) {
        return await interaction.reply({
          content: '❌ Invalid MAC address. Expected format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX',
          ephemeral: true
        });
      }
    }

    try {
      if (subcommand === 'add') {
        await BlacklistIpService.add(interaction.guild.id, macAddress, reason, interaction.user.id);

        const embed = this._makeEmbed({
          title: '✅ MAC address added to blacklist',
          description: `MAC address \`${macAddress}\` has been added to the blacklist.`,
          fields: [
            { name: '🔒 MAC address', value: `\`${macAddress}\``, inline: true },
            { name: '📝 Reason', value: reason || 'No reason specified', inline: false },
            { name: '👮 Added by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
          ],
          color: 0x57F287
        });

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'remove') {
        await BlacklistIpService.remove(macAddress);

        const embed = this._makeEmbed({
          title: '✅ MAC address removed from blacklist',
          description: `MAC address \`${macAddress}\` has been removed from the blacklist.`,
          fields: [
            { name: '🔒 MAC address', value: `\`${macAddress}\``, inline: true },
            { name: '👮 Removed by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
          ],
          color: 0x57F287
        });

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'update') {
        await BlacklistIpService.update(macAddress, reason);

        const embed = this._makeEmbed({
          title: '✅ Reason updated',
          description: `The reason for MAC address \`${macAddress}\` has been updated.`,
          fields: [
            { name: '🔒 MAC address', value: `\`${macAddress}\``, inline: true },
            { name: '📝 New reason', value: reason, inline: false },
            { name: '👮 Updated by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
          ],
          color: 0x57F287
        });

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'view') {
        const blacklistEntry = await BlacklistIpService.get(macAddress);
        const addedByUser = await interaction.client.users.fetch(blacklistEntry.added_by).catch(() => null);

        const embed = this._makeEmbed({
          title: '📋 Blacklist information (MAC)',
          description: `Information about MAC address \`${macAddress}\``,
          fields: [
            { name: '🔒 MAC address', value: `\`${macAddress}\``, inline: true },
            { name: '📝 Reason', value: blacklistEntry.reason || 'No reason specified', inline: false },
            { name: '👮 Added by', value: addedByUser ? `${addedByUser.tag} (${blacklistEntry.added_by})` : `ID: ${blacklistEntry.added_by}`, inline: true },
            { name: '📅 Added at', value: this._formatDiscordTime(blacklistEntry.created_at), inline: true },
            { name: '🔄 Last update', value: this._formatDiscordTime(blacklistEntry.updated_at), inline: true }
          ]
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });

      } else if (subcommand === 'list') {
        const entries = await BlacklistIpService.list();

        if (entries.length === 0) {
          return await interaction.reply({
            content: '✅ No MAC addresses in the blacklist.',
            ephemeral: true
          });
        }

        const embed = this._makeEmbed({
          title: '📋 Blacklisted MAC addresses',
          description: `Total: ${entries.length} MAC address(es)`
        });

        entries.forEach((entry, index) => {
          embed.addFields({
            name: `${index + 1}. MAC: ${entry.mac_address}`,
            value: `**Reason:** ${entry.reason || 'None'}\n**Added:** ${this._formatDiscordTimeRelative(entry.created_at)}`,
            inline: false
          });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      if (error.message === 'MAC_ALREADY_BLACKLISTED') {
        return await interaction.reply({
          content: `❌ MAC address \`${macAddress}\` is already blacklisted.`,
          ephemeral: true
        });
      } else if (error.message === 'MAC_NOT_FOUND') {
        return await interaction.reply({
          content: `❌ MAC address \`${macAddress}\` is not blacklisted.`,
          ephemeral: true
        });
      }
      throw error;
    }
  }
};


