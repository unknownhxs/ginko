const { add } = require("../services/blacklistIdService");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  async setstatut(client) {
    // importation json des statuts disponibles
    const list_statut = require("../data/list_statut.json");

    while (true) {
      if (!client.user || !client.user.presence) break;
      if (client.user.presence.status === "offline") break;

      if (client.user.presence.status === "dnd") { // mode maintenant avec /maintenance disponible que avec l'owner
        await client.user.setActivity(list_statut["M"], { type: 0 });
        await new Promise((r) => setTimeout(r, 12000)); // attente de 12 secondes
      } else {
        const statut_keys = Object.keys(list_statut);
        const random_key = statut_keys.filter(key => key !== "M")[Math.floor(Math.random() * (statut_keys.length - 1))];
        await client.user.setActivity(list_statut[random_key], { type: 1, url: "https://twitch.tv/hxs_here" });
        await new Promise((r) => setTimeout(r, 12000)); // attente de 12 secondes
      }
    }
  },

  async execute(client) {
    console.log(`${client.user.tag} is online.`); 
    const DEV_ID = '1368556179600445531';
    // Notify developer that bot is online
    try {
    const devUser = await client.users.fetch(DEV_ID);
      if (devUser) {
        const onlineEmbed = new EmbedBuilder()
          .setTitle('Bot is now online.')
          .setColor(0x57F287)
          .setTimestamp();
          // Wait for a valid ping value before sending the message
          let ping = Math.round(client.ws.ping);
          let attempts = 0;
          while (ping <= 0 && attempts < 10) {
            await new Promise(r => setTimeout(r, 500));
            ping = Math.round(client.ws.ping);
            attempts++;
          }

          const addButton = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('ping_button')
                .setLabel(`Ping: ${ping}ms`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
        await devUser.send({ embeds: [onlineEmbed], components: [addButton] }).catch(console.error);
        console.log('✓ Developer has been notified of bot online status.');
      }    
    } catch (error) {
      console.error('Error notifying developer on bot ready:', error);
    }                                   
    await this.setstatut(client);                                                           
  },
};
