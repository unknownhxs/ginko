<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ginko - Dashboard</title>
    <link rel="stylesheet" href="index.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <i class="fas fa-leaf"></i>
                    <span>Ginko</span>
                </div>
                <button class="sidebar-toggle" id="sidebarToggle">
                    <i class="fas fa-bars"></i>
                </button>
            </div>

            <nav class="sidebar-menu">
                <a href="#" class="menu-item active" data-section="overview">
                    <i class="fas fa-home"></i>
                    <span>Accueil</span>
                </a>
                <a href="#" class="menu-item" data-section="servers">
                    <i class="fas fa-server"></i>
                    <span>Serveurs</span>
                </a>
                <a href="#" class="menu-item" data-section="moderation">
                    <i class="fas fa-gavel"></i>
                    <span>Modération</span>
                </a>
                <a href="#" class="menu-item" data-section="blacklist">
                    <i class="fas fa-ban"></i>
                    <span>Blacklist</span>
                </a>
                <a href="#" class="menu-item" data-section="settings">
                    <i class="fas fa-cog"></i>
                    <span>Paramètres</span>
                </a>
                <a href="#" class="menu-item" data-section="reports">
                    <i class="fas fa-file-alt"></i>
                    <span>Logs</span>
                </a>
            </nav>

            <div class="sidebar-footer">
                <a href="#" class="user-profile">
                    <img src="https://via.placeholder.com/40" alt="Avatar">
                    <div class="user-info">
                        <span class="user-name">Admin</span>
                        <span class="user-status">En ligne</span>
                    </div>
                </a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <header class="top-bar">
                <div class="header-left">
                    <h1 id="section-title">Accueil</h1>
                    <p id="section-subtitle">Vue d'ensemble du système</p>
                </div>
                <div class="header-right">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Rechercher...">
                    </div>
                    <button class="notification-btn">
                        <i class="fas fa-bell"></i>
                        <span class="badge">3</span>
                    </button>
                </div>
            </header>

            <!-- Content Area -->
            <div class="content">
                <!-- Overview Section -->
                <section id="overview" class="section active">
                    <div class="card">
                        <div class="card-header">
                            <h2>État du Bot Ginko</h2>
                        </div>
                        <div class="bot-status">
                            <div class="status-item">
                                <div class="status-icon online">
                                    <i class="fas fa-power-off"></i>
                                </div>
                                <div class="status-content">
                                    <p class="status-label">Status Bot</p>
                                    <h3 class="status-value">En ligne</h3>
                                </div>
                            </div>
                            <div class="status-item">
                                <div class="status-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div class="status-content">
                                    <p class="status-label">Serveurs gérés</p>
                                    <h3 class="status-value">42</h3>
                                </div>
                            </div>
                            <div class="status-item">
                                <div class="status-icon">
                                    <i class="fas fa-shield-alt"></i>
                                </div>
                                <div class="status-content">
                                    <p class="status-label">Actions aujourd'hui</p>
                                    <h3 class="status-value">127</h3>
                                </div>
                            </div>
                            <div class="status-item">
                                <div class="status-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="status-content">
                                    <p class="status-label">Uptime</p>
                                    <h3 class="status-value">99.9%</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Servers Section -->
                <section id="servers" class="section">
                    <div class="card">
                        <div class="card-header">
                            <h2>Serveurs Discord</h2>
                        </div>
                        <div class="servers-list" id="serversList">
                            <!-- Servers will be populated here -->
                        </div>
                    </div>
                </section>

                <!-- Moderation Section -->
                <section id="moderation" class="section">
                    <div class="card">
                        <div class="card-header">
                            <h2>Configuration Modération</h2>
                        </div>
                        <form class="config-form" id="modForm">
                            <div class="form-group">
                                <label>Serveur cible</label>
                                <select id="modServer" class="form-input">
                                    <option value="">Sélectionner un serveur...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Type d'action</label>
                                <select id="actionType" class="form-input">
                                    <option value="">Sélectionner une action...</option>
                                    <option value="ban">Ban</option>
                                    <option value="kick">Kick</option>
                                    <option value="mute">Mute</option>
                                    <option value="warn">Warning</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Raison</label>
                                <input type="text" class="form-input" id="reason" placeholder="Raison de l'action...">
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Sauvegarder
                            </button>
                        </form>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h2>Actions Récentes</h2>
                        </div>
                        <div class="actions-list" id="actionsList">
                            <!-- Actions will be populated here -->
                        </div>
                    </div>
                </section>

                <!-- Blacklist Section -->
                <section id="blacklist" class="section">
                    <div class="card">
                        <div class="card-header">
                            <h2>Gestion Blacklist</h2>
                        </div>
                        <form class="config-form" id="blacklistForm">
                            <div class="form-group">
                                <label>Type de blocage</label>
                                <select id="blacklistType" class="form-input">
                                    <option value="">Sélectionner le type...</option>
                                    <option value="user">Utilisateur</option>
                                    <option value="ip">Adresse IP</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Identifiant/IP</label>
                                <input type="text" class="form-input" id="blacklistValue" placeholder="ID utilisateur ou IP...">
                            </div>
                            <div class="form-group">
                                <label>Raison</label>
                                <input type="text" class="form-input" id="blacklistReason" placeholder="Raison du blocage...">
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-plus"></i> Ajouter à la blacklist
                            </button>
                        </form>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h2>Liste Noire</h2>
                        </div>
                        <div class="blacklist-list" id="blacklistItems">
                            <!-- Blacklist items will be populated here -->
                        </div>
                    </div>
                </section>

                <!-- Settings Section -->
                <section id="settings" class="section">
                    <div class="card">
                        <div class="card-header">
                            <h2>Paramètres Généraux</h2>
                        </div>
                        <div class="settings-list" id="settingsList">
                            <!-- Settings will be populated here -->
                        </div>
                    </div>
                </section>

                <!-- Logs Section -->
                <section id="reports" class="section">
                    <div class="card">
                        <div class="card-header">
                            <h2>Historique des Actions</h2>
                        </div>
                        <div class="logs-list" id="logsList">
                            <!-- Logs will be populated here -->
                        </div>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>
