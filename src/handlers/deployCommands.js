const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

module.exports = async (client) => {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'cmds', 'slash');
  
  try {
    const commandFiles = await fs.readdir(commandsPath);
    
    for (const file of commandFiles) {
      if (file.endsWith('.js')) {
        const command = require(path.join(commandsPath, file));
        if (command.data) {
          commands.push(command.data.toJSON());
        }
      }
    }
    // Purge des anciennes commandes avant l'enregistrement des nouvelles commandes
    const restPurge = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await restPurge.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );
    console.log(`✓ Anciennes commandes supprimées`);

    // Enregistrer les commandes slash globalement (disponibles sur tous les serveurs)
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    console.log(`📝 Enregistrement global de ${commands.length} commande(s) slash...`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log(`✓ ${data.length} commande(s) slash enregistrée(s) globalement avec succès!`);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des commandes:', error);
  }
};
