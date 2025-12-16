const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show the list of available commands'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📚 Command Guide - RudyProtect')
      .setColor(0x5865F2)
      .setDescription('Here are all available commands organized by category:')
      .setTimestamp()
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    // Category: Reports
    embed.addFields({
      name: '🚨 Reports',
      value: 
        '`/report` - Report a bug, suggestion, language error, or other issue',
      inline: false
    });

    // Category: Moderation
    embed.addFields({
      name: '🛡️ Moderation',
      value: 
        '`/ban` - Ban a user from the server\n' +
        '`/kick` - Kick a user from the server\n' +
        '`/mute` - Mute a user (timeout)',
      inline: false
    });

    // Category: Blacklist
    embed.addFields({
      name: '🚫 Blacklist',
      value: 
        '`/blacklist id add|remove|update|view|list` - Manage user ID blacklist\n' +
        '`/blacklist ip add|remove|update|view|list` - Manage MAC address blacklist',
      inline: false
    });

    // Category: Anti-raid protection
    embed.addFields({
      name: '⚔️ Anti-raid protection',
      value: 
        '`/raid enable|disable|config|status` - Configure and control anti-raid',
      inline: false
    });

    // Category: Utilities
      embed.addFields({
      name: '🔧 Utilities',
      value: 
        '`/help` - Display this help message\n' +
        '`/ping` - Check bot latency',
        inline: false
      });

    // Note about permissions
      embed.addFields({
      name: 'ℹ️ Note',
      value: 'Some commands require specific permissions (Administrator, Ban Members, Kick Members, etc.)',
        inline: false
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};


