// Configuration et variables globales
let currentCaptcha = '';
let captchaSessionId = '';

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Initialiser l'application
function initializeApp() {
    generateCaptcha();
    loadStats();
    if (config.isLoggedIn) {
        loadDashboardData();
    }
}

// Configuration des événements
function setupEventListeners() {
    // Menu hamburger
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Fermer le menu quand on clique sur un lien
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
            });
        });
    }

    // Input CAPTCHA avec touche Entrée
    const captchaInput = document.getElementById('captcha-input');
    if (captchaInput) {
        captchaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyCaptcha();
            }
        });
    }
}

// ===== CAPTCHA FUNCTIONS =====

// Générer un captcha
function generateCaptcha() {
    try {
        fetch(`${config.apiUrl}/api/captcha/generate`)
            .then(response => response.json())
            .then(data => {
                currentCaptcha = data.code;
                captchaSessionId = data.sessionId;
                updateCaptchaDisplay(data.display);
                clearCaptchaInput();
                hideCaptchaMessage();
            })
            .catch(error => {
                console.error('Erreur génération captcha:', error);
                generateLocalCaptcha();
            });
    } catch (error) {
        generateLocalCaptcha();
    }
}

// Générer un captcha localement (fallback)
function generateLocalCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentCaptcha = code;
    updateCaptchaDisplay(addVisualNoise(code));
    clearCaptchaInput();
}

// Ajouter du bruit visuel au code
function addVisualNoise(code) {
    const chars = code.split('');
    return chars.map(char => {
        const spaces = Math.random() > 0.5 ? ' ' : '';
        return spaces + char;
    }).join('');
}

// Mettre à jour l'affichage du captcha
function updateCaptchaDisplay(display) {
    const captchaCode = document.querySelector('.captcha-code');
    if (captchaCode) {
        captchaCode.textContent = display;
    }
}

// Effacer l'input du captcha
function clearCaptchaInput() {
    const input = document.getElementById('captcha-input');
    if (input) {
        input.value = '';
    }
}

// Vérifier le captcha
function verifyCaptcha() {
    const input = document.getElementById('captcha-input');
    if (!input || !input.value.trim()) {
        showCaptchaMessage('Veuillez entrer le code', 'error');
        return;
    }

    const userCode = input.value.trim().toUpperCase();

    // Vérification serveur
    fetch(`${config.apiUrl}/api/captcha/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: userCode,
            expected: currentCaptcha,
            sessionId: captchaSessionId
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                showCaptchaMessage('✅ Code valide! Accès autorisé', 'success');
                input.value = '';
                setTimeout(generateCaptcha, 2000);
            } else {
                showCaptchaMessage('❌ Code invalide. Réessayez', 'error');
                input.value = '';
            }
        })
        .catch(error => {
            console.error('Erreur vérification:', error);
            // Vérification locale en fallback
            if (userCode === currentCaptcha) {
                showCaptchaMessage('✅ Code valide! Accès autorisé', 'success');
                input.value = '';
                setTimeout(generateCaptcha, 2000);
            } else {
                showCaptchaMessage('❌ Code invalide. Réessayez', 'error');
                input.value = '';
            }
        });
}

// Rafraîchir le captcha
function refreshCaptcha() {
    generateCaptcha();
}

// Afficher un message du captcha
function showCaptchaMessage(text, type) {
    const messageEl = document.getElementById('captcha-message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `captcha-message ${type}`;
        messageEl.style.display = 'block';
    }
}

// Masquer le message du captcha
function hideCaptchaMessage() {
    const messageEl = document.getElementById('captcha-message');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
}

// ===== STATS FUNCTIONS =====

// Charger les statistiques
function loadStats() {
    try {
        fetch(`${config.apiUrl}/api/stats`)
            .then(response => response.json())
            .then(data => {
                updateStats(data);
            })
            .catch(error => {
                console.error('Erreur chargement stats:', error);
                // Afficher des données simulées
                simulateStats();
            });
    } catch (error) {
        simulateStats();
    }
}

// Mettre à jour les statistiques
function updateStats(data) {
    animateCounter('stat-members', data.members || 0);
    animateCounter('stat-servers', data.servers || 0);
    animateCounter('stat-threats', data.threats || 0);
}

// Simuler les statistiques
function simulateStats() {
    animateCounter('stat-members', Math.floor(Math.random() * 5000) + 1000);
    animateCounter('stat-servers', Math.floor(Math.random() * 500) + 100);
    animateCounter('stat-threats', Math.floor(Math.random() * 10000) + 1000);
}

// Animer un compteur
function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const start = parseInt(element.textContent) || 0;
    const duration = 1000;
    const steps = 50;
    const increment = (target - start) / steps;
    let current = start;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        current += increment;
        element.textContent = Math.floor(current).toLocaleString('fr-FR');

        if (step >= steps) {
            element.textContent = target.toLocaleString('fr-FR');
            clearInterval(timer);
        }
    }, duration / steps);
}

// ===== DASHBOARD FUNCTIONS =====

// Charger les données du dashboard
function loadDashboardData() {
    loadServers();
    loadIncidents();
}

// Charger les serveurs
function loadServers() {
    const serversList = document.getElementById('servers-list');
    if (!serversList) return;

    try {
        fetch(`${config.apiUrl}/api/servers`)
            .then(response => response.json())
            .then(data => {
                if (data.servers && data.servers.length > 0) {
                    serversList.innerHTML = data.servers.map(server => `
                        <div class="server-item">
                            <div class="server-icon">${server.icon || '📦'}</div>
                            <div class="server-info">
                                <div class="server-name">${server.name}</div>
                                <div class="server-members">${server.memberCount || 0} membres</div>
                            </div>
                            <div class="server-status">
                                <span class="status-badge ${server.protected ? 'protected' : 'unprotected'}">
                                    ${server.protected ? '🛡️ Protégé' : 'Non protégé'}
                                </span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    serversList.innerHTML = '<p class="loading">Aucun serveur trouvé</p>';
                }
            })
            .catch(error => {
                console.error('Erreur chargement serveurs:', error);
                serversList.innerHTML = '<p class="loading">Erreur lors du chargement</p>';
            });
    } catch (error) {
        serversList.innerHTML = '<p class="loading">Erreur lors du chargement</p>';
    }
}

// Charger les incidents
function loadIncidents() {
    const incidentsList = document.getElementById('incidents-list');
    if (!incidentsList) return;

    try {
        fetch(`${config.apiUrl}/api/incidents`)
            .then(response => response.json())
            .then(data => {
                if (data.incidents && data.incidents.length > 0) {
                    incidentsList.innerHTML = data.incidents.map(incident => `
                        <div class="incident-item">
                            <div class="incident-icon">${getIncidentIcon(incident.type)}</div>
                            <div class="incident-info">
                                <div class="incident-title">${incident.title}</div>
                                <div class="incident-time">${formatDate(incident.timestamp)}</div>
                            </div>
                            <div class="incident-severity">
                                <span class="severity-badge ${incident.severity}">
                                    ${incident.severity.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    incidentsList.innerHTML = '<p class="loading">Aucun incident récent</p>';
                }
            })
            .catch(error => {
                console.error('Erreur chargement incidents:', error);
                incidentsList.innerHTML = '<p class="loading">Erreur lors du chargement</p>';
            });
    } catch (error) {
        incidentsList.innerHTML = '<p class="loading">Erreur lors du chargement</p>';
    }
}

// Obtenir l'icône pour un type d'incident
function getIncidentIcon(type) {
    const icons = {
        'raid': '🚀',
        'spam': '📢',
        'ban': '🚫',
        'warning': '⚠️',
        'threat': '⛔'
    };
    return icons[type] || '📋';
}

// Formater une date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    
    return date.toLocaleDateString('fr-FR');
}

// ===== UTILITY FUNCTIONS =====

// Scroller vers une section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Copier du texte
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copié au presse-papiers!', 'success');
    }).catch(() => {
        showNotification('Erreur lors de la copie', 'error');
    });
}

// Afficher une notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ===== EXPORT FUNCTIONS =====

// Exporter les données
function exportData() {
    try {
        fetch(`${config.apiUrl}/api/export`)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rudyprotect-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                showNotification('Données exportées avec succès', 'success');
            })
            .catch(error => {
                console.error('Erreur export:', error);
                showNotification('Erreur lors de l\'export', 'error');
            });
    } catch (error) {
        showNotification('Erreur lors de l\'export', 'error');
    }
}

console.log('Script chargé avec succès');
