const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../../../config/config');
const { reportInternalError } = require('../../services/reportErrorService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to ban')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .addIntegerOption(option =>
      option
        .setName('delete_messages')
        .setDescription('Number of days of messages to delete (0-7)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason specified';
    const deleteDays = interaction.options.getInteger('delete_messages') || 0;

    // Checks
    if (user.id === interaction.user.id) {
      const embed = new EmbedBuilder()
        .setTitle('You cannot ban yourself!')
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (user.id === interaction.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setTitle('You cannot ban the server owner.')
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
        const embed = new EmbedBuilder()
          .setTitle('You cannot ban a user with a role equal or higher than yours.')
          .setColor(0xED4245);
        return await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });
      }

      if (!member.bannable) {
        const embed = new EmbedBuilder()
          .setTitle("I can't ban this user. Ensure my role is above theirs.")
          .setColor(0xED4245);
        return await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });
      }
    }

    try {
      // Ban the user
      await interaction.guild.members.ban(user.id, {
        reason: `${reason} - Banned by ${interaction.user.tag}`,
        deleteMessageDays: deleteDays
      });

      // Enregistrer dans la base de données (optionnel, si vous voulez une table bans)
      // await pool.query('INSERT INTO bans (guild_id, user_id, reason, banned_by, created_at) VALUES ($1, $2, $3, $4, NOW())', [interaction.guild.id, user.id, raison, interaction.user.id]);

      const embed = new EmbedBuilder()
        .setDescription(`User **${user.tag}** has been banned from the server.`)
        .addFields(
          { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
        )
        .setColor(0xED4245)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Send a DM to the user (if possible)
      try {
        const dmEmbed = new EmbedBuilder()
          .setDescription(`You have been banned from **${interaction.guild.name}**.\n -# *Reason: ${reason}*`)
          .setColor(0xED4245)
          .setTimestamp();

        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        // The user may have DMs disabled
      }

    } catch (error) {
      console.error('Error while banning:', error);      
      // Automatically report the error to the developer
      await reportInternalError(interaction.client, error, {
        commandName: 'ban',
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel
      });
            const embed = new EmbedBuilder()
        .setTitle('An error occurred. Please contact my developer (use \/report).')
        .setColor(0xED4245);
      console.log(`Command error: ${error.message}`);
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
};


