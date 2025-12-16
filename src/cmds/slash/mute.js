const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../../../config/config');
const { reportInternalError } = require('../../services/reportErrorService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user (timeout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to mute')
        .setRequired(true))
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Mute duration in minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)) // Maximum 28 jours (40320 minutes)
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const durationMinutes = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason specified';
    const durationMs = durationMinutes * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    // Checks
    if (user.id === interaction.user.id) {
      const embed = new EmbedBuilder()
        .setTitle("You can't mute yourself :/")
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (user.id === interaction.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setTitle("You can't mute the server owner!")
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      const embed = new EmbedBuilder()
        .setTitle('This user is not a member of the server.')
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setTitle('You cannot mute this user due to role hierarchy.')
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      const embed = new EmbedBuilder()
        .setTitle("You don't have permission to mute this user.")
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    try {
      // Apply the timeout
      await member.timeout(durationMs, `${reason} - Muted by ${interaction.user.tag}`);

      // Enregistrer dans la base de données
      await pool.query(
        'INSERT INTO mutes (guild_id, user_id, reason, muted_by, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (guild_id, user_id) DO UPDATE SET reason = $3, muted_by = $4, expires_at = $5, created_at = NOW()',
        [interaction.guild.id, user.id, reason, interaction.user.id, expiresAt]
      );

      const durationText = durationMinutes < 60 
        ? `${durationMinutes} minute(s)`
        : durationMinutes < 1440
        ? `${Math.floor(durationMinutes / 60)} hour(s)`
        : `${Math.floor(durationMinutes / 1440)} day(s)`;

      const embed = new EmbedBuilder()
        .setDescription(`User **${user.tag}** has been muted.`)
        .addFields(
          { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
          { name: '⏱️ Duration', value: durationText, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '⏰ Expires at', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
 
        )
        .setColor(0xFFA500)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Send a DM to the user (if possible)
      try {
        const dmEmbed = new EmbedBuilder()
          .setDescription(`You have been muted on **${interaction.guild.name}**.`)
          .addFields(
            { name: '⏱️ Duration', value: durationText, inline: true },
            { name: '⏰ Expires at', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
            { name: '📝 Reason', value: reason, inline: false }
          )
          .setColor(0xFFA500)
          .setTimestamp();

        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        // The user may have DMs disabled
      }

    } catch (error) {
      console.error('Error while muting:', error);
      
      // Automatically report the error to the developer
      await reportInternalError(interaction.client, error, {
        commandName: 'mute',
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
        content: `❌ An error occurred while muting: ${error.message}`,
        ephemeral: true
      });
    }
  }
};


