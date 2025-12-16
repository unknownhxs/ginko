const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../../../config/config');
const { reportInternalError } = require('../../services/reportErrorService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure bot settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('captcha')
        .setDescription('Configure the captcha system')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable captcha (default: false)')
            .setRequired(false))
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to send captcha (leave empty to use welcome channel)')
            .setRequired(false))
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to assign after verification (leave empty for none)')
            .setRequired(false))
        .addIntegerOption(option =>
          option
            .setName('timeout')
            .setDescription('Kick timeout if not verified (minutes, 0 = disabled, default: 10)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(60)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View the current configuration')),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'captcha') {
        // Get or create configuration
        let config = await pool.query(
          'SELECT * FROM captcha_config WHERE guild_id = $1',
          [interaction.guild.id]
        );

        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const timeout = interaction.options.getInteger('timeout');

        if (config.rows.length === 0) {
          // Create a new configuration
          await pool.query(
            'INSERT INTO captcha_config (guild_id, enabled, channel_id, role_id, timeout_minutes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
            [
              interaction.guild.id,
              enabled !== null ? enabled : false,
              channel?.id || null,
              role?.id || null,
              timeout !== null ? timeout : 10
            ]
          );
        } else {
          // Update the existing configuration
          const currentConfig = config.rows[0];
          await pool.query(
            'UPDATE captcha_config SET enabled = COALESCE($1, enabled), channel_id = COALESCE($2, channel_id), role_id = COALESCE($3, role_id), timeout_minutes = COALESCE($4, timeout_minutes), updated_at = NOW() WHERE guild_id = $5',
            [
              enabled !== null ? enabled : currentConfig.enabled,
              channel?.id || null,
              role?.id || null,
              timeout !== null ? timeout : currentConfig.timeout_minutes,
              interaction.guild.id
            ]
          );
        }

        // Fetch the updated configuration
        config = await pool.query(
          'SELECT * FROM captcha_config WHERE guild_id = $1',
          [interaction.guild.id]
        );

        const updatedConfig = config.rows[0];
        const configChannel = updatedConfig.channel_id 
          ? interaction.guild.channels.cache.get(updatedConfig.channel_id) 
          : null;
        const configRole = updatedConfig.role_id 
          ? interaction.guild.roles.cache.get(updatedConfig.role_id) 
          : null;

        const embed = new EmbedBuilder()
          .setTitle('⚙️ Captcha configuration updated')
          .setDescription('Captcha settings have been updated.')
          .addFields(
            { name: '🛡️ Status', value: updatedConfig.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📝 Channel', value: configChannel ? `${configChannel}` : 'Default welcome channel', inline: true },
            { name: '🎭 Role', value: configRole ? `${configRole}` : 'None', inline: true },
            { name: '⏰ Timeout', value: updatedConfig.timeout_minutes > 0 ? `${updatedConfig.timeout_minutes} minute(s)` : 'Disabled', inline: true }
          )
          .setColor(0x5865F2)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'status') {
        // Fetch all configurations
        const captchaConfig = await pool.query(
          'SELECT * FROM captcha_config WHERE guild_id = $1',
          [interaction.guild.id]
        );

        const embed = new EmbedBuilder()
          .setTitle('📊 Bot configuration')
          .setDescription('Current bot configuration for this server')
          .setColor(0x5865F2)
          .setTimestamp();

        // Configuration captcha
        if (captchaConfig.rows.length > 0) {
          const capConfig = captchaConfig.rows[0];
          const capChannel = capConfig.channel_id 
            ? interaction.guild.channels.cache.get(capConfig.channel_id) 
            : null;
          const capRole = capConfig.role_id 
            ? interaction.guild.roles.cache.get(capConfig.role_id) 
            : null;

          embed.addFields({
            name: '🔐 Captcha',
            value: `**Status:** ${capConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                   `**Channel:** ${capChannel ? capChannel : 'Default'}\n` +
                   `**Role:** ${capRole ? capRole : 'None'}\n` +
                   `**Timeout:** ${capConfig.timeout_minutes > 0 ? `${capConfig.timeout_minutes} min` : 'Disabled'}`,
            inline: false
          });
        } else {
          embed.addFields({
            name: '🔐 Captcha',
            value: '❌ Not configured',
            inline: false
          });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error('Error while handling configuration:', error);
      
      // Automatically report the error to the developer
      await reportInternalError(interaction.client, error, {
        commandName: 'config',
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
  }
};
