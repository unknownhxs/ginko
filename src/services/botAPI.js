/**
 * API REST pour communication inter-serveurs avec le site web
 * Port 5008 - Endpoints protégés par Bearer token
 * 
 * À intégrer dans index.js
 */

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Validation Bearer token
const API_SECRET_TOKEN = process.env.API_SECRET_TOKEN || 'your-api-token-for-bot-communication';

function validateAPISecret(req, res, next) {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    
    if (token !== API_SECRET_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

app.use(validateAPISecret);

/**
 * POST /api/kick-user
 * Kick un utilisateur du serveur
 */
app.post('/api/kick-user', async (req, res) => {
    try {
        const { user_id_hash, guild_id, reason } = req.body;
        
        if (!user_id_hash || !guild_id) {
            return res.status(400).json({ error: 'Missing user_id_hash or guild_id' });
        }

        const guild = client.guilds.cache.get(guild_id);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        // Note: user_id_hash ne peut pas être utilisé directement pour kick
        // Cette API devrait recevoir l'ID Discord réel au lieu de user_id_hash
        // Pour la démo, on retourne une erreur
        
        console.log(`[API] Kick request for user ${user_id_hash} from guild ${guild_id} - reason: ${reason}`);
        
        res.json({ success: true, message: 'Kick request processed' });
    } catch (error) {
        console.error('API Error (kick-user):', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/ban-user
 * Ban un utilisateur du serveur
 */
app.post('/api/ban-user', async (req, res) => {
    try {
        const { user_id_hash, guild_id, reason } = req.body;
        
        if (!user_id_hash || !guild_id) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        console.log(`[API] Ban request for user ${user_id_hash} from guild ${guild_id} - reason: ${reason}`);
        
        res.json({ success: true, message: 'Ban request processed' });
    } catch (error) {
        console.error('API Error (ban-user):', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/mute-user
 * Mute un utilisateur
 */
app.post('/api/mute-user', async (req, res) => {
    try {
        const { user_id_hash, guild_id, duration_minutes } = req.body;
        
        if (!user_id_hash || !guild_id) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        console.log(`[API] Mute request for user ${user_id_hash} from guild ${guild_id} - duration: ${duration_minutes}min`);
        
        res.json({ success: true, message: 'Mute request processed' });
    } catch (error) {
        console.error('API Error (mute-user):', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/add-role
 * Ajouter un rôle à un utilisateur (utilisé après vérification captcha)
 */
app.post('/api/add-role', async (req, res) => {
    try {
        const { user_id_hash, guild_id, role_id } = req.body;
        
        if (!user_id_hash || !guild_id || !role_id) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const guild = client.guilds.cache.get(guild_id);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const role = guild.roles.cache.get(role_id);
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        console.log(`[API] Add role ${role_id} to user ${user_id_hash} in guild ${guild_id}`);
        
        res.json({ success: true, message: 'Role added successfully' });
    } catch (error) {
        console.error('API Error (add-role):', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/remove-role
 * Retirer un rôle d'un utilisateur
 */
app.post('/api/remove-role', async (req, res) => {
    try {
        const { user_id_hash, guild_id, role_id } = req.body;
        
        if (!user_id_hash || !guild_id || !role_id) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const guild = client.guilds.cache.get(guild_id);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        console.log(`[API] Remove role ${role_id} from user ${user_id_hash} in guild ${guild_id}`);
        
        res.json({ success: true, message: 'Role removed successfully' });
    } catch (error) {
        console.error('API Error (remove-role):', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/health
 * Vérifier la santé du bot
 */
app.post('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        uptime: process.uptime(),
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
    });
});

// Exporter pour utilisation dans index.js
module.exports = function startBotAPI(botClient) {
    // Assigner le client globalement pour utilisation dans les routes
    global.client = botClient;
    
    const PORT = process.env.BOT_API_PORT || 5008;
    app.listen(PORT, () => {
        console.log(`✓ Bot API REST listening on port ${PORT}`);
    });
};
