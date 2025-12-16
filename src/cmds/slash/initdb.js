const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { initDatabase } = require('../../../config/config');
const { reportInternalError } = require('../../services/reportErrorService');

// ID de l'utilisateur autorisé
const AUTHORIZED_USER_ID = '1368556179600445531';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('initdb')
    .setDescription('🔧 Initialiser la base de données (Admin uniquement)'),
  
  async execute(interaction) {
    // Vérifier que l'utilisateur est autorisé
    if (interaction.user.id !== AUTHORIZED_USER_ID) {
      // Répondre avec une erreur générique pour que l'utilisateur ne sache pas que la commande existe
      return await interaction.reply({
        content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
        ephemeral: true
      });
    }

    try {
      // Répondre immédiatement pour éviter le timeout
      await interaction.deferReply({ ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('⏳ Initialisation de la base de données')
        .setColor(0xFFA500)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Exécuter l'initialisation
      await initDatabase();

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Initialisation réussie')
        .setDescription('La base de données a été initialisée avec succès!')
        .setColor(0x57F287)
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      console.log(`✅ Base de données initialisée par ${interaction.user.tag} (${interaction.user.id})`);

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
      
      // Signaler l'erreur automatiquement au développeur
      await reportInternalError(interaction.client, error, {
        commandName: 'initdb',
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel
      });

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Erreur lors de l\'initialisation')
        .setDescription(`Une erreur s'est produite:\n\`\`\`${error.message}\`\`\``)
        .setColor(0xED4245)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
