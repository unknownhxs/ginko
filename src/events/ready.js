module.exports = {
  name: 'ready',
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
    this.setstatut(client);                                                                                                   
  },
};
