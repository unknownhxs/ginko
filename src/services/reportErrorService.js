const DEV_ID = '1368556179600445531';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function reportInternalError(client, error, commandInfo = null) {
    try {
        const devUser = await client.users.fetch(DEV_ID);
        const date = new Date().toLocaleString('fr-FR');
        
        const errorStack = error.stack || error.toString();
        const errorMessage = error.message || 'Erreur inconnue';
        
        let description = `**🔴 Erreur interne détectée**\n\n`;
        description += `**Message d'erreur:**\n\`\`\`${errorMessage}\`\`\`\n`;
        
        if (commandInfo) {
            description += `**Provenance:** Commande\n`;
            description += `**Commande:** \`${commandInfo.commandName}\`\n`;
            if (commandInfo.user) {
                description += `**Utilisateur:** ${commandInfo.user.tag} (${commandInfo.user.id})\n`;
            }
            if (commandInfo.guild) {
                description += `**Serveur:** ${commandInfo.guild.name} (${commandInfo.guild.id})\n`;
            }
            if (commandInfo.channel) {
                description += `**Canal:** ${commandInfo.channel.name || 'DM'}\n`;
            }
        } else {
            description += `**Provenance:** Erreur globale (hors commande)\n`;
        }
        
        description += `\n**Stack trace:**\n\`\`\`${errorStack.slice(0, 1500)}\`\`\``;
        
        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Rapport d'erreur - ${date}`)
            .setDescription(description)
            .setColor(0xFF0000)
            .setTimestamp();
        
        const row = new ActionRowBuilder();
        
        if (commandInfo && commandInfo.guild) {
            const inviteButton = new ButtonBuilder()
                .setLabel('Rejoindre le serveur')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${commandInfo.guild.id}`);
            row.addComponents(inviteButton);
        } else {
            const dmButton = new ButtonBuilder()
                .setLabel('Erreur interne')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('internal_error')
                .setDisabled(true);
            row.addComponents(dmButton);
        }
        
        await devUser.send({ embeds: [embed], components: [row] });
    } catch (err) {
        console.error('❌ Impossible d\'envoyer le rapport d\'erreur au développeur:', err);
    }
}

module.exports = { reportInternalError };