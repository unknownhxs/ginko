const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../../../config/config');
const { reportInternalError } = require('../../services/reportErrorService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configurer les paramètres du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('captcha')
        .setDescription('Configurer le système de captcha')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Activer ou désactiver le captcha (défaut: false)')
            .setRequired(false))
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Canal où envoyer le captcha (laissez vide pour le canal de bienvenue)')
            .setRequired(false))
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Rôle à donner après vérification (laissez vide pour aucun)')
            .setRequired(false))
        .addIntegerOption(option =>
          option
            .setName('timeout')
            .setDescription('Temps avant expulsion si non vérifié (en minutes, 0 = désactivé, défaut: 10)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(60)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Voir la configuration actuelle')),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'captcha') {
        // Récupérer ou créer la configuration
        let config = await pool.query(
          'SELECT * FROM captcha_config WHERE guild_id = $1',
          [interaction.guild.id]
        );

        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const timeout = interaction.options.getInteger('timeout');

        if (config.rows.length === 0) {
          // Créer une nouvelle configuration
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
          // Mettre à jour la configuration existante
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

        // Récupérer la configuration mise à jour
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
          .setTitle('⚙️ Configuration du captcha mise à jour')
          .setDescription('Les paramètres du captcha ont été mis à jour.')
          .addFields(
            { name: '🛡️ Statut', value: updatedConfig.enabled ? '✅ Activé' : '❌ Désactivé', inline: true },
            { name: '📝 Canal', value: configChannel ? `${configChannel}` : 'Canal de bienvenue par défaut', inline: true },
            { name: '🎭 Rôle', value: configRole ? `${configRole}` : 'Aucun', inline: true },
            { name: '⏰ Timeout', value: updatedConfig.timeout_minutes > 0 ? `${updatedConfig.timeout_minutes} minute(s)` : 'Désactivé', inline: true }
          )
          .setColor(0x5865F2)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'status') {
        // Récupérer toutes les configurations
        const captchaConfig = await pool.query(
          'SELECT * FROM captcha_config WHERE guild_id = $1',
          [interaction.guild.id]
        );

        const embed = new EmbedBuilder()
          .setTitle('📊 Configuration du bot')
          .setDescription('Configuration actuelle du bot pour ce serveur')
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
            value: `**Statut:** ${capConfig.enabled ? '✅ Activé' : '❌ Désactivé'}\n` +
                   `**Canal:** ${capChannel ? capChannel : 'Par défaut'}\n` +
                   `**Rôle:** ${capRole ? capRole : 'Aucun'}\n` +
                   `**Timeout:** ${capConfig.timeout_minutes > 0 ? `${capConfig.timeout_minutes} min` : 'Désactivé'}`,
            inline: false
          });
        } else {
          embed.addFields({
            name: '🔐 Captcha',
            value: '❌ Non configuré',
            inline: false
          });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error('Erreur lors de la gestion de la configuration:', error);
      
      // Signaler l'erreur automatiquement au développeur
      await reportInternalError(interaction.client, error, {
        commandName: 'config',
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel
      });
      
      if (error.code === '42P01' || error.code === 'ER_NO_SUCH_TABLE') {
        const errorEmbed = new EmbedBuilder()
          .setTitle('⚠️ Erreur de configuration')
          .setDescription('La base de données n\'est pas correctement configurée. Veuillez exécuter le script d\'initialisation.')
          .setColor(0xED4245);

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      await interaction.reply({
        content: '❌ Une erreur s\'est produite. Veuillez réessayer plus tard.',
        ephemeral: true
      });
    }
  }
};
