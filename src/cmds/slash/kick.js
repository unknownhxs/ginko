const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../../../config/config');
const { reportInternalError } = require('../../services/reportErrorService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to kick')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason specified';

    // Checks
    if (user.id === interaction.user.id) {
      const embed = new EmbedBuilder()
        .setTitle('*You cannot kick yourself.*')
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (user.id === interaction.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setTitle('*You cannot kick the server owner.*')
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      const embed = new EmbedBuilder()
        .setTitle('User not found')
        .setColor(0xED4245);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setTitle('Action forbidden')
        .setDescription('*You cannot kick this user because they have a role equal or higher than yours.*')
        .setColor(0xED4245);
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (!member.kickable) {
      const embed = new EmbedBuilder()
        .setTitle('Action required')
        .setDescription("*I can't kick this user. Ensure my role is above theirs and that I have the Kick Members permission.*")
        .setColor(0xff7f00);//orange
      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    try {
      // Kick the user
      await member.kick(`${reason} - Kicked by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setDescription(`User **${user.tag}** has been kicked from the server.`)
        .setColor(0xFFA500)
        //.setImage("")
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Send a DM to the user (if possible)
      try {
        const dmEmbed = new EmbedBuilder()
          .setDescription(`You have been kicked from **${interaction.guild.name}**.`)
          .addFields(
            { name: '📝 Reason', value: reason, inline: false }
          )
          .setColor(0xFFA500)
          .setTimestamp();

        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        // The user may have DMs disabled
      }

    } catch (error) {
      console.error('Error while kicking:', error);
      
      // Automatically report the error to the developer
      await reportInternalError(interaction.client, error, {
        commandName: 'kick',
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel
      });
      
      await interaction.reply({
        content: `❌ An error occurred while kicking: ${error.message}`,
        ephemeral: true
      });
    }
  }
};


