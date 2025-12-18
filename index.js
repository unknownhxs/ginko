const { Client, IntentsBitField, Collection } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
const { initDatabase } = require('./config/config');
const { reportInternalError } = require('./src/services/reportErrorService');
const startBotAPI = require('./src/services/botAPI');
require('dotenv').config();

// Initialiser le client Discord
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessages
  ]
});

// Collections pour les commandes et événements
client.commands = new Collection();
client.events = new Collection();

// Charger le prefix depuis .env
client.prefix = process.env.PREFIX || 'g!';

// Charger les handlers
async function loadHandlers() {
  const handlersPath = path.join(__dirname, 'src', 'handlers');
  
  try {
    const handlerFiles = await fs.readdir(handlersPath);
    
    for (const file of handlerFiles) {
      if (file.endsWith('.js')) {
        const handler = require(path.join(handlersPath, file));
        if (typeof handler === 'function') {
          await handler(client);
          console.log(`✓ Handler chargé: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des handlers:', error);
  }
}

// Charger les commandes slash et prefix
async function loadCommands() {
  const slashPath = path.join(__dirname, 'src', 'cmds', 'slash');
  const prefixPath = path.join(__dirname, 'src', 'cmds', 'prefix');
  
  try {
    // Charger les commandes slash
    if (await fs.readdir(slashPath).catch(() => null)) {
      const slashFiles = await fs.readdir(slashPath);
      for (const file of slashFiles) {
        if (file.endsWith('.js')) {
          const command = require(path.join(slashPath, file));
          if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            console.log(`✓ Commande slash chargée: ${command.data.name}`);
          }
        }
      }
    }
    
    // Charger les commandes prefix
    if (await fs.readdir(prefixPath).catch(() => null)) {
      const prefixFiles = await fs.readdir(prefixPath);
      for (const file of prefixFiles) {
        if (file.endsWith('.js')) {
          const command = require(path.join(prefixPath, file));
          if (command.execute) {
            client.commands.set(command.name, command);
            console.log(`✓ Commande prefix chargée: ${command.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des commandes:', error);
  }
}

// Charger les événements
async function loadEvents() {
  const eventsPath = path.join(__dirname, 'src', 'events');
  
  try {
    const eventFiles = await fs.readdir(eventsPath);
    
    for (const file of eventFiles) {
      if (file.endsWith('.js')) {
        const event = require(path.join(eventsPath, file));
        if (event.name && event.execute) {
          if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
          } else {
            client.on(event.name, (...args) => event.execute(...args));
          }
          console.log(`✓ Événement chargé: ${event.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des événements:', error);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée (Promise rejetée):', error);
  if (client.isReady()) {
    reportInternalError(client, error).catch(console.error);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée (Exception):', error);
  if (client.isReady()) {
    reportInternalError(client, error).catch(console.error);
  }
});

// Gestion des erreurs du client Discord
client.on('error', (error) => {
  console.error('❌ Erreur client Discord:', error);
  reportInternalError(client, error).catch(console.error);
});

// Initialiser le bot
async function start() {
  try {
    console.log('⏳ Chargement du bot...\n');
    
    // Initialise la base de données au démarrage pour éviter les tables manquantes
    await initDatabase();
    console.log('');

    await loadHandlers();
    console.log('');
    
    await loadCommands();
    console.log('');
    
    await loadEvents();
    console.log('');
    
    await client.login(process.env.DISCORD_TOKEN);
    console.log('✓ Bot connecté!');
    
    // Démarrer l'API REST après connexion Discord
    startBotAPI(client);
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error);
    reportInternalError(client, error).catch(console.error);
    process.exit(1);
  }
}

start();
