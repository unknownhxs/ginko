const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Store pour les captchas (en production, utilisez Redis)
const captchaStore = new Map();

// Générer un code captcha
function generateCaptchaCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Ajouter des perturbations visuelles au code
function addVisualNoise(code) {
    const chars = code.split('');
    return chars.map(char => {
        // Ajouter des espaces aléatoires
        const spaces = Math.random() > 0.5 ? ' ' : '';
        return spaces + char;
    }).join('');
}

// Routes API

// Générer un nouveau captcha
app.get('/api/captcha/generate', (req, res) => {
    const code = generateCaptchaCode();
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Stocker le captcha avec expiration (5 minutes)
    captchaStore.set(sessionId, {
        code,
        expires: Date.now() + 5 * 60 * 1000
    });
    
    // Nettoyer les captchas expirés
    cleanExpiredCaptchas();
    
    res.json({
        sessionId,
        code,
        display: addVisualNoise(code)
    });
});

// Vérifier un captcha
app.post('/api/captcha/verify', (req, res) => {
    const { code, expected, sessionId } = req.body;
    
    if (!code) {
        return res.status(400).json({
            valid: false,
            message: 'Code requis'
        });
    }
    
    // Vérification simple (peut être améliorée avec sessionId)
    const isValid = code.toUpperCase() === expected.toUpperCase();
    
    res.json({
        valid: isValid,
        message: isValid ? 'Code valide' : 'Code invalide'
    });
});

// Obtenir les statistiques
app.get('/api/stats', async (req, res) => {
    try {
        // Ici, vous pouvez connecter à votre base de données
        // Pour l'exemple, on retourne des données simulées
        const stats = {
            members: Math.floor(Math.random() * 2000) + 1000,
            blacklistIp: Math.floor(Math.random() * 50) + 10,
            blacklistId: Math.floor(Math.random() * 30) + 5,
            reports: Math.floor(Math.random() * 20) + 1,
            timestamp: new Date().toISOString()
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Erreur stats:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des statistiques'
        });
    }
});

// Route pour la blacklist
app.get('/api/blacklist', (req, res) => {
    // À implémenter avec votre base de données
    res.json({
        ips: [],
        ids: []
    });
});

// Route pour les rapports
app.get('/api/reports', (req, res) => {
    // À implémenter avec votre base de données
    res.json({
        reports: []
    });
});

// Nettoyer les captchas expirés
function cleanExpiredCaptchas() {
    const now = Date.now();
    for (const [key, value] of captchaStore.entries()) {
        if (value.expires < now) {
            captchaStore.delete(key);
        }
    }
}

// Nettoyer toutes les 10 minutes
setInterval(cleanExpiredCaptchas, 10 * 60 * 1000);

// Route par défaut
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Dashboard serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 Dashboard accessible à: http://localhost:${PORT}`);
    console.log(`🔐 API CAPTCHA disponible`);
});

module.exports = app;
