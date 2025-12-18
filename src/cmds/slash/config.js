const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../../../config/config');
const { reportInternalError } = require('../../services/reportErrorService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure bot settings with an interactive menu')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    try {
      // Fetch current configuration
      const captchaConfig = await pool.query(
        'SELECT * FROM captcha_config WHERE guild_id = $1',
        [interaction.guild.id]
      );

      const config = captchaConfig.rows[0] || {};
      const configChannel = config.channel_id 
        ? interaction.guild.channels.cache.get(config.channel_id) 
        : null;
      const configRole = config.role_id 
        ? interaction.guild.roles.cache.get(config.role_id) 
        : null;

      // Create main settings embed
      const mainEmbed = new EmbedBuilder()
        .setTitle('⚙️ Bot Settings')
        .setDescription('Select an option below to configure the bot')
        .addFields(
          { 
            name: '🔐 Captcha System', 
            value: `**Status:** ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n**Channel:** ${configChannel ? configChannel : 'Default'}\n**Role:** ${configRole ? configRole : 'None'}\n**Timeout:** ${config.timeout_minutes > 0 ? `${config.timeout_minutes} min` : 'Disabled'}`,
            inline: false 
          }
        )
        .setColor(0x5865F2)
        .setTimestamp();

      // Create menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('settings_menu')
        .setPlaceholder('Select a configuration option...')
        .addOptions(
          {
            label: 'Captcha Settings',
            description: 'Configure captcha system',
            value: 'captcha_settings',
            emoji: '🔐'
          }
        );

      const row = new ActionRowBuilder()
        .addComponents(selectMenu);

      await interaction.reply({ 
        embeds: [mainEmbed], 
        components: [row],
        ephemeral: true 
      });

    } catch (error) {
      console.error('Error in /settings command:', error);
      
      await reportInternalError(interaction.client, error, {
        commandName: 'settings',
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel
      });
      
      await interaction.reply({
        content: '❌ An error occurred. Please try again later.',
        ephemeral: true
      });
    }
  }
};
