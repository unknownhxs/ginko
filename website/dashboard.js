// ===== DASHBOARD FUNCTIONALITY =====

// État global
let currentUser = null;
let currentSection = 'overview';

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    initializeNavigation();
    initializeSectionLogic();
    loadDashboardData();
});

// ===== NAVIGATION =====
function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });
}

function switchSection(section) {
    // Mettre à jour la navigation active
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });

    // Mettre à jour la section active
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');

    currentSection = section;
}

// ===== CHARGER LES DONNÉES UTILISATEUR =====
function loadUserData() {
    // Récupérer les données de l'utilisateur depuis sessionStorage ou fetch
    const userStr = sessionStorage.getItem('ginko_user');
    
    if (userStr) {
        currentUser = JSON.parse(userStr);
        updateUserProfile();
    } else {
        // Rediriger vers la page de connexion si pas d'utilisateur
        window.location.href = '/';
    }
}

function updateUserProfile() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.username || 'Utilisateur';
        if (currentUser.avatar) {
            document.getElementById('userAvatar').src = currentUser.avatar;
        }
    }
}

// ===== CHARGER LES DONNÉES DU DASHBOARD =====
function loadDashboardData() {
    // Données de démonstration
    const servers = [
        { id: 1, name: 'Mon Serveur Discord', members: 1250, prefix: '!' },
        { id: 2, name: 'Communauté Gaming', members: 850, prefix: '.' }
    ];

    const activityData = [
        { type: 'Ban', user: 'SpamBot#1234', time: 'Il y a 2 heures', status: 'success' },
        { type: 'Mute', user: 'Troll#5678', time: 'Il y a 5 heures', status: 'warning' },
        { type: 'Kick', user: 'Attacker#9012', time: 'Il y a 1 jour', status: 'danger' }
    ];

    // Mettre à jour les stats
    document.getElementById('serverCount').textContent = servers.length;
    document.getElementById('userCount').textContent = (servers.reduce((acc, s) => acc + s.members, 0)).toLocaleString();
    document.getElementById('threatCount').textContent = '42';
    document.getElementById('uptime').textContent = '99.9%';

    // Mettre à jour l'activité récente
    updateActivityList(activityData);

    // Charger les serveurs
    loadServers(servers);
}

function updateActivityList(activities) {
    const container = document.getElementById('recentActivity');
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune activité récente</p>';
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong>${activity.type}</strong>
                <span class="log-level ${activity.status}">${activity.status}</span>
            </div>
            <div>${activity.user}</div>
            <div class="activity-time">${activity.time}</div>
        </div>
    `).join('');
}

function loadServers(servers) {
    const container = document.getElementById('serversList');
    
    if (servers.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun serveur configuré</p>';
        return;
    }

    container.innerHTML = servers.map(server => `
        <div class="server-card">
            <div class="server-name">${server.name}</div>
            <div class="server-info">
                <i class="fas fa-users"></i> ${server.members} membres
            </div>
            <div class="server-info">
                Préfixe: <strong>${server.prefix}</strong>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-primary btn-sm" onclick="editServer(${server.id})" style="flex: 1; padding: 0.6rem;">
                    <i class="fas fa-edit"></i> Éditer
                </button>
                <button class="btn btn-secondary btn-sm" onclick="deleteServer(${server.id})" style="flex: 1; padding: 0.6rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ===== INITIALISER LA LOGIQUE DES SECTIONS =====
function initializeSectionLogic() {
    // Sliders
    const slider = document.getElementById('spamSensitivity');
    if (slider) {
        slider.addEventListener('input', (e) => {
            document.getElementById('sensitivityValue').textContent = e.target.value + '/10';
        });
    }

    // Filtres des logs
    const logSearch = document.getElementById('logSearch');
    if (logSearch) {
        logSearch.addEventListener('input', filterLogs);
    }

    const logType = document.getElementById('logType');
    if (logType) {
        logType.addEventListener('change', filterLogs);
    }

    // Charger les logs
    loadLogs();
}

// ===== GESTION DES LOGS =====
function loadLogs() {
    const logs = [
        { level: 'success', message: 'Bot démarré avec succès', time: '2024-01-15 10:30' },
        { level: 'info', message: 'Serveur 1 synchronisé', time: '2024-01-15 10:25' },
        { level: 'warning', message: 'Tentative de spam détectée', time: '2024-01-15 10:20' },
        { level: 'error', message: 'Erreur de connexion API', time: '2024-01-15 10:15' },
        { level: 'info', message: 'Nouveau membre vérifié', time: '2024-01-15 10:10' }
    ];

    displayLogs(logs);
}

function displayLogs(logs) {
    const container = document.getElementById('logsList');
    
    if (logs.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun journal disponible</p>';
        return;
    }

    container.innerHTML = logs.map(log => `
        <div class="log-entry">
            <div class="log-message">
                <div>${log.message}</div>
                <div class="log-time">${log.time}</div>
            </div>
            <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
        </div>
    `).join('');
}

function filterLogs() {
    const searchTerm = document.getElementById('logSearch').value.toLowerCase();
    const logType = document.getElementById('logType').value;

    const entries = document.querySelectorAll('.log-entry');
    entries.forEach(entry => {
        const message = entry.querySelector('.log-message').textContent.toLowerCase();
        const level = entry.querySelector('.log-level').textContent.toLowerCase();

        const matchesSearch = message.includes(searchTerm);
        const matchesType = !logType || level.includes(logType);

        entry.style.display = (matchesSearch && matchesType) ? 'flex' : 'none';
    });
}

// ===== GESTION DE LA BLACKLIST =====
function switchBlacklistTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tab + 'Tab').classList.add('active');

    loadBlacklist(tab);
}

function loadBlacklist(type) {
    const data = {
        ids: [
            { value: '123456789', date: '2024-01-10', reason: 'Spammeur' },
            { value: '987654321', date: '2024-01-08', reason: 'Bot malveillant' }
        ],
        ips: [
            { value: '192.168.1.100', date: '2024-01-12', reason: 'Attaque DDoS' },
            { value: '10.0.0.50', date: '2024-01-09', reason: 'Spam' }
        ]
    };

    const container = type === 'ids' ? 
        document.getElementById('idsList') : 
        document.getElementById('ipsList');

    const items = data[type + 's'];

    if (items.length === 0) {
        container.innerHTML = `<p class="empty-state">Aucun ${type} en blacklist</p>`;
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <div class="log-entry">
            <div class="log-message">
                <div><strong>${item.value}</strong></div>
                <div class="log-time">${item.reason} - Ajouté le ${item.date}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="removeFromBlacklist(${index}, '${type}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function removeFromBlacklist(index, type) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément?')) {
        showNotification('Élément supprimé de la blacklist', 'success');
        loadBlacklist(type);
    }
}

// ===== FONCTIONS DE SAUVEGARDE =====
function saveModerationSettings() {
    const settings = {
        antiSpam: document.getElementById('antiSpam').checked,
        antiLink: document.getElementById('antiLink').checked,
        spamSensitivity: document.getElementById('spamSensitivity').value,
        modRole: document.getElementById('modRole').value
    };

    console.log('Paramètres de modération sauvegardés:', settings);
    showNotification('Paramètres de modération sauvegardés!', 'success');
    localStorage.setItem('modSettings', JSON.stringify(settings));
}

function saveSettings() {
    const settings = {
        botPrefix: document.getElementById('botPrefix').value || '!',
        captchaEnabled: document.getElementById('captchaEnabled').checked,
        captchaDelay: document.getElementById('captchaDelay').value,
        notificationsEnabled: document.getElementById('notificationsEnabled').checked,
        logChannel: document.getElementById('logChannel').value
    };

    console.log('Paramètres sauvegardés:', settings);
    showNotification('Paramètres sauvegardés avec succès!', 'success');
    localStorage.setItem('botSettings', JSON.stringify(settings));
}

// ===== FONCTIONS SERVEURS =====
function showAddServerModal() {
    showNotification('Fonctionnalité en développement', 'info');
}

function editServer(id) {
    showNotification(`Édition du serveur ${id}`, 'info');
}

function deleteServer(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce serveur?')) {
        showNotification('Serveur supprimé', 'success');
    }
}

// ===== FONCTIONS BLACKLIST =====
function showAddBlacklistModal() {
    showNotification('Fonctionnalité en développement', 'info');
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: center;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#8b5cf6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 2000;
        animation: slideIn 0.3s ease forwards;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== MODAL MANAGEMENT =====
function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    const modals = document.querySelectorAll('.modal');
    
    backdrop.classList.remove('active');
    modals.forEach(modal => modal.classList.remove('active'));
}

// ===== LOGOUT =====
function logout() {
    sessionStorage.removeItem('ginko_user');
    window.location.href = '/';
}

// ===== ANIMATIONS CSS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .btn-sm {
        padding: 0.6rem 1rem;
        font-size: 0.9rem;
    }
`;

document.head.appendChild(style);

console.log('✨ Dashboard Ginko chargé avec succès!');
