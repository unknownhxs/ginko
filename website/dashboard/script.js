// ===================================
// RUDYPROTECT DASHBOARD - JavaScript
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeSidebar();
    loadConfiguration();
    populateSelects();
});

// ===== NAVIGATION =====
function initializeNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const sectionId = item.getAttribute('data-section');
            
            // Remove active from all
            menuItems.forEach(m => m.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active to clicked
            item.classList.add('active');
            document.getElementById(sectionId).classList.add('active');
            
            // Update header
            const titles = {
                'overview': { title: 'Accueil', subtitle: 'Vue d\'ensemble du système' },
                'servers': { title: 'Serveurs', subtitle: 'Configuration des serveurs Discord' },
                'moderation': { title: 'Modération', subtitle: 'Configuration de la modération' },
                'blacklist': { title: 'Blacklist', subtitle: 'Gestion des utilisateurs bannis' },
                'settings': { title: 'Paramètres', subtitle: 'Paramètres généraux' },
                'reports': { title: 'Logs', subtitle: 'Historique des actions du bot' }
            };
            
            if (titles[sectionId]) {
                document.getElementById('section-title').textContent = titles[sectionId].title;
                document.getElementById('section-subtitle').textContent = titles[sectionId].subtitle;
            }
            
            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.remove('active');
            }
        });
    });
}

// ===== SIDEBAR =====
function initializeSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

// ===== CONFIGURATION MANAGEMENT =====
function loadConfiguration() {
    // Load from localStorage
    const config = JSON.parse(localStorage.getItem('rudyprotect_config')) || {};
    
    // Load moderation config
    if (config.prefix) {
        document.getElementById('prefixInput').value = config.prefix;
    }
}

function saveModConfig() {
    const config = {
        server: document.getElementById('modServerSelect').value,
        prefix: document.getElementById('prefixInput').value,
        logChannel: document.getElementById('logChannelSelect').value,
        modRole: document.getElementById('modRoleSelect').value
    };
    
    localStorage.setItem('rudyprotect_config', JSON.stringify(config));
    addLog('Configuration', 'Paramètres de modération sauvegardés');
    showNotification('Configuration modération sauvegardée!', 'success');
}

function addBlacklist() {
    const type = document.getElementById('blacklistType').value;
    const value = document.getElementById('blacklistValue').value;
    const reason = document.getElementById('blacklistReason').value;
    
    if (!value) {
        showNotification('Veuillez entrer une valeur', 'error');
        return;
    }
    
    // Get existing blacklist
    let blacklist = JSON.parse(localStorage.getItem('rudyprotect_blacklist')) || [];
    
    // Add new item
    blacklist.push({
        id: Date.now(),
        type: type,
        value: value,
        reason: reason,
        date: new Date().toLocaleDateString('fr-FR')
    });
    
    // Save
    localStorage.setItem('rudyprotect_blacklist', JSON.stringify(blacklist));
    
    // Clear inputs
    document.getElementById('blacklistValue').value = '';
    document.getElementById('blacklistReason').value = '';
    
    // Refresh display
    displayBlacklist();
    addLog('Blacklist', `${type} "${value}" ajouté à la blacklist`);
    showNotification('Élément ajouté à la blacklist!', 'success');
}

function removeFromBlacklist(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément?')) return;
    
    let blacklist = JSON.parse(localStorage.getItem('rudyprotect_blacklist')) || [];
    const item = blacklist.find(i => i.id === id);
    blacklist = blacklist.filter(item => item.id !== id);
    
    localStorage.setItem('rudyprotect_blacklist', JSON.stringify(blacklist));
    displayBlacklist();
    addLog('Blacklist', `${item.type} "${item.value}" supprimé de la blacklist`);
    showNotification('Élément supprimé de la blacklist', 'success');
}

function displayBlacklist() {
    const container = document.getElementById('blacklistItems');
    const blacklist = JSON.parse(localStorage.getItem('rudyprotect_blacklist')) || [];
    
    if (blacklist.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Aucun élément dans la blacklist</p>';
        return;
    }
    
    container.innerHTML = blacklist.map(item => `
        <div class="blacklist-item">
            <div class="item-icon danger">
                <i class="fas fa-${item.type === 'user' ? 'user-slash' : 'link-slash'}"></i>
            </div>
            <div class="item-content">
                <h4>${item.type === 'user' ? 'Utilisateur: ' + item.value : 'IP: ' + item.value}</h4>
                <p>Ajouté le ${item.date}</p>
                <span class="item-reason">Raison: ${item.reason || 'Non spécifiée'}</span>
            </div>
            <button class="btn-danger" onclick="removeFromBlacklist(${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function populateSelects() {
    // Simulated server data
    const servers = [
        { id: 1, name: 'Serveur Principal' },
        { id: 2, name: 'Gaming Hub' },
        { id: 3, name: 'Communauté Study' }
    ];
    
    const channels = [
        { id: 1, name: '#logs' },
        { id: 2, name: '#admin' },
        { id: 3, name: '#moderation' }
    ];
    
    const roles = [
        { id: 1, name: 'Modérateur' },
        { id: 2, name: 'Admin' },
        { id: 3, name: 'Propriétaire' }
    ];
    
    // Populate server selects
    const serverSelects = ['modServerSelect'];
    serverSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.id;
            option.textContent = server.name;
            select.appendChild(option);
        });
    });
    
    // Populate channel select
    const logChannelSelect = document.getElementById('logChannelSelect');
    channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = channel.name;
        logChannelSelect.appendChild(option);
    });
    
    // Populate role select
    const modRoleSelect = document.getElementById('modRoleSelect');
    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.name;
        modRoleSelect.appendChild(option);
    });
    
    // Display blacklist
    displayBlacklist();
    displayLogs();
}

function displayLogs() {
    const container = document.getElementById('logsList');
    const logs = JSON.parse(localStorage.getItem('rudyprotect_logs')) || [];
    
    if (logs.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Aucun log disponible</p>';
        return;
    }
    
    // Show last 20 logs
    const recentLogs = logs.slice(-20).reverse();
    
    container.innerHTML = recentLogs.map(log => `
        <div class="log-item">
            <div class="log-time">${log.time}</div>
            <p class="log-message"><strong>${log.action}</strong>: ${log.message}</p>
        </div>
    `).join('');
}

// ===== SETTINGS TOGGLES =====
document.addEventListener('change', function(e) {
    if (e.target.type === 'checkbox' && e.target.closest('.toggle')) {
        const setting = e.target.closest('.setting-item').querySelector('h4').textContent;
        const value = e.target.checked;
        
        let settings = JSON.parse(localStorage.getItem('rudyprotect_settings')) || {};
        settings[setting] = value;
        localStorage.setItem('rudyprotect_settings', JSON.stringify(settings));
        
        addLog(`Paramètre: ${setting}`, value ? 'Activé' : 'Désactivé');
    }
});

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const style = document.createElement('style');
    if (!document.querySelector('style[data-toast]')) {
        style.setAttribute('data-toast', 'true');
        style.innerHTML = `
            .toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                animation: slideIn 0.3s ease-out;
                z-index: 2000;
                max-width: 300px;
            }
            
            .toast-success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            
            .toast-error {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }
            
            .toast-info {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            }
            
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
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== LOGS MANAGEMENT =====
function addLog(action, message) {
    let logs = JSON.parse(localStorage.getItem('rudyprotect_logs')) || [];
    
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR');
    
    logs.push({
        action: action,
        message: message,
        time: time,
        timestamp: Date.now()
    });
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs = logs.slice(-100);
    }
    
    localStorage.setItem('rudyprotect_logs', JSON.stringify(logs));
}

// ===== SEARCH FUNCTIONALITY =====
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            // Add search logic here if needed
        });
    }
});

// ===== NOTIFICATIONS BUTTON =====
window.addEventListener('load', function() {
    const notifBtn = document.querySelector('.notification-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', function() {
            showNotification('Vous avez 3 notifications', 'info');
        });
    }
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) searchInput.focus();
    }
});

// Initialize with welcome log
window.addEventListener('load', function() {
    addLog('Système', 'Dashboard chargé');
    displayLogs();
});

console.log('🛡️ RudyProtect Dashboard initialized successfully!');
            
            document.getElementById('section-title').textContent = titleMap[sectionId];
            document.getElementById('section-subtitle').textContent = subtitleMap[sectionId];
            
            // Close sidebar on mobile after selection
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

// ===== SIDEBAR TOGGLE =====
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
    });
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle')) {
                closeSidebar();
            }
        }
    });
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.remove('open');
}

// ===== SEARCH FUNCTIONALITY =====
function initializeSearch() {
    const searchBox = document.querySelector('.search-box input');
    
    searchBox.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        // Add your search logic here
        console.log('Searching for:', searchTerm);
    });
}

// ===== NOTIFICATIONS =====
function initializeNotifications() {
    const notificationBtn = document.querySelector('.notification-btn');
    
    notificationBtn.addEventListener('click', function() {
        console.log('Opening notifications');
        // Add notification modal/dropdown logic here
    });
}

// ===== HOVER EFFECTS =====
function addHoverEffects() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// ===== TOGGLE SETTINGS =====
document.addEventListener('change', function(e) {
    if (e.target.type === 'checkbox') {
        const label = e.target.closest('.toggle');
        if (label) {
            const settingName = e.target.closest('.setting-item')?.querySelector('h4')?.textContent;
            const isChecked = e.target.checked;
            console.log(`${settingName}: ${isChecked ? 'Activé' : 'Désactivé'}`);
            // Add API call to save settings here
        }
    }
});

// ===== ACTION BUTTONS =====
document.addEventListener('click', function(e) {
    // Handle action buttons
    if (e.target.closest('.btn-success')) {
        handleApproval(e.target.closest('.report-item'));
    }
    
    if (e.target.closest('.btn-danger:not(.more-btn)')) {
        handleDelete(e.target.closest('[class*="item"]'));
    }
    
    if (e.target.closest('.btn-secondary[type="button"]')) {
        handleEdit(e.target.closest('[class*="item"]'));
    }
});

function handleApproval(element) {
    if (element) {
        element.style.opacity = '0.5';
        setTimeout(() => {
            element.remove();
            showNotification('Action approuvée', 'success');
        }, 300);
    }
}

function handleDelete(element) {
    if (element && confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
        element.style.opacity = '0.5';
        setTimeout(() => {
            element.remove();
            showNotification('Élément supprimé', 'success');
        }, 300);
    }
}

function handleEdit(element) {
    console.log('Editing element:', element);
    showNotification('Mode édition', 'info');
}

// ===== NOTIFICATIONS TOAST =====
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const style = document.createElement('style');
    if (!document.querySelector('style[data-toast]')) {
        style.setAttribute('data-toast', 'true');
        style.innerHTML = `
            .toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                animation: slideIn 0.3s ease-out;
                z-index: 2000;
                max-width: 300px;
            }
            
            .toast-success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            
            .toast-error {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }
            
            .toast-info {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            }
            
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
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== CHART ANIMATION =====
window.addEventListener('load', function() {
    animateChart();
});

function animateChart() {
    const bars = document.querySelectorAll('.chart-bar');
    bars.forEach((bar, index) => {
        const height = bar.style.height;
        bar.style.height = '0';
        setTimeout(() => {
            bar.style.transition = 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.height = height;
        }, index * 100);
    });
}

// ===== STATS COUNTER ANIMATION =====
function animateStatValue(element) {
    const finalValue = element.textContent;
    const numericValue = parseInt(finalValue.replace(/,/g, ''));
    
    if (!isNaN(numericValue)) {
        let currentValue = 0;
        const increment = numericValue / 30;
        
        const counter = setInterval(() => {
            currentValue += increment;
            if (currentValue >= numericValue) {
                element.textContent = finalValue;
                clearInterval(counter);
            } else {
                element.textContent = Math.floor(currentValue).toLocaleString();
            }
        }, 30);
    }
}

// Animate stat values on page load
window.addEventListener('load', function() {
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(value => animateStatValue(value));
});

// ===== RESPONSIVE HANDLING =====
window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
    }
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.search-box input').focus();
    }
    
    // Escape to close sidebar on mobile
    if (e.key === 'Escape') {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }
});

// ===== THEME TOGGLE =====
const themeToggle = document.querySelector('.setting-item:nth-child(3) .toggle input');
if (themeToggle) {
    themeToggle.addEventListener('change', function() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', this.checked ? 'dark' : 'light');
    });
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        themeToggle.checked = true;
        document.body.classList.add('dark-mode');
    }
}

// ===== SMOOTH ANIMATIONS =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeIn 0.6s ease-in forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.card, .stat-card').forEach(card => {
    observer.observe(card);
});

// ===== DYNAMIC BADGE UPDATE =====
function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-btn .badge');
    if (badge) {
        badge.textContent = count;
        if (count === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'flex';
        }
    }
}

// ===== USER PROFILE MENU =====
const userProfile = document.querySelector('.user-profile');
if (userProfile) {
    userProfile.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Opening user profile menu');
        // Add dropdown menu logic here
    });
}

console.log('RudyProtect Dashboard initialized successfully! 🛡️');
