<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

// Configuration
$config = [
    'siteName' => 'RudyProtect',
    'version' => '1.0.0',
    'apiUrl' => 'http://localhost:3001'
];

// Vérifier si l'utilisateur est connecté
$isLoggedIn = isset($_SESSION['user_id']);
$userName = $isLoggedIn ? $_SESSION['user_name'] : null;
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RudyProtect - Dashboard Discord Protection</title>
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="container">
            <div class="navbar-brand">
                <a href="/" class="logo">
                    <i class="fas fa-shield-alt"></i>
                    <span>RudyProtect</span>
                </a>
            </div>
            <ul class="nav-menu">
                <li><a href="/" class="nav-link active">Dashboard</a></li>
                <li><a href="#features" class="nav-link">Fonctionnalités</a></li>
                <li><a href="#stats" class="nav-link">Statistiques</a></li>
                <li class="dropdown">
                    <a href="#" class="nav-link dropdown-toggle">
                        <i class="fas fa-user-circle"></i>
                        <?php echo $isLoggedIn ? $userName : 'Compte'; ?>
                    </a>
                    <div class="dropdown-menu">
                        <?php if ($isLoggedIn): ?>
                            <a href="/profile">Mon Profil</a>
                            <a href="/settings">Paramètres</a>
                            <hr>
                            <a href="/logout">Déconnexion</a>
                        <?php else: ?>
                            <a href="/login">Connexion</a>
                            <a href="/register">Inscription</a>
                        <?php endif; ?>
                    </div>
                </li>
            </ul>
            <div class="hamburger">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container hero-content">
            <div class="hero-text">
                <h1>Protégez votre serveur Discord</h1>
                <p>Système de protection avancé avec captcha, anti-raid et modération intelligente</p>
                <div class="hero-buttons">
                    <button class="btn btn-primary" onclick="document.getElementById('captcha-demo').scrollIntoView({ behavior: 'smooth' })">
                        Essayer maintenant
                    </button>
                    <a href="#features" class="btn btn-secondary">
                        En savoir plus
                    </a>
                </div>
            </div>
            <div class="hero-image">
                <div class="floating-card">
                    <div class="card-icon"><i class="fas fa-lock"></i></div>
                    <div class="card-text">Protection active</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
        <div class="container">
            <h2 class="section-title">Nos fonctionnalités</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3>CAPTCHA Intelligent</h3>
                    <p>Système de vérification en ligne pour éviter les bot indésirables</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-shield-virus"></i>
                    </div>
                    <h3>Anti-Raid</h3>
                    <p>Protection contre les attaques et les utilisateurs malveillants</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-gavel"></i>
                    </div>
                    <h3>Modération</h3>
                    <p>Outils de modération avancés et automatisés</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>Analytics</h3>
                    <p>Suivi en temps réel de votre serveur</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-list-check"></i>
                    </div>
                    <h3>Blacklist</h3>
                    <p>Gestion des utilisateurs et IP bloqués</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-cog"></i>
                    </div>
                    <h3>Configuration</h3>
                    <p>Paramètres personnalisables pour chaque serveur</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CAPTCHA Demo Section -->
    <section id="captcha-demo" class="captcha-section">
        <div class="container">
            <h2 class="section-title">Démonstration CAPTCHA</h2>
            <div class="captcha-demo-container">
                <div class="captcha-box">
                    <h3>Vérification CAPTCHA</h3>
                    <div class="captcha-display" id="captcha-display">
                        <span class="captcha-code">LOADING...</span>
                    </div>
                    <div class="captcha-input-group">
                        <input 
                            type="text" 
                            id="captcha-input" 
                            class="captcha-input" 
                            placeholder="Entrez le code ci-dessus"
                            maxlength="6"
                        >
                    </div>
                    <div class="captcha-buttons">
                        <button class="btn btn-primary" onclick="verifyCaptcha()">
                            <i class="fas fa-check"></i> Vérifier
                        </button>
                        <button class="btn btn-outline" onclick="refreshCaptcha()">
                            <i class="fas fa-sync-alt"></i> Nouveau
                        </button>
                    </div>
                    <div id="captcha-message" class="captcha-message"></div>
                </div>
            </div>
        </div>
    </section>

    <!-- Stats Section -->
    <section id="stats" class="stats-section">
        <div class="container">
            <h2 class="section-title">Statistiques</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value" id="stat-members">0</div>
                    <div class="stat-label">Membres Protégés</div>
                    <div class="stat-bar"><div class="stat-bar-fill" style="width: 75%"></div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-servers">0</div>
                    <div class="stat-label">Serveurs</div>
                    <div class="stat-bar"><div class="stat-bar-fill" style="width: 60%"></div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-threats">0</div>
                    <div class="stat-label">Menaces Bloquées</div>
                    <div class="stat-bar"><div class="stat-bar-fill" style="width: 85%"></div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-uptime">99.9%</div>
                    <div class="stat-label">Disponibilité</div>
                    <div class="stat-bar"><div class="stat-bar-fill" style="width: 99.9%"></div></div>
                </div>
            </div>
        </div>
    </section>

    <!-- Dashboard Section (if logged in) -->
    <?php if ($isLoggedIn): ?>
    <section class="dashboard-section">
        <div class="container">
            <h2 class="section-title">Tableau de Bord</h2>
            <div class="dashboard-grid">
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>Serveurs</h3>
                        <i class="fas fa-server"></i>
                    </div>
                    <div class="card-content">
                        <div class="servers-list" id="servers-list">
                            <p class="loading">Chargement...</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>Incidents Récents</h3>
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="card-content">
                        <div class="incidents-list" id="incidents-list">
                            <p class="loading">Chargement...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- CTA Section -->
    <section class="cta-section">
        <div class="container">
            <h2>Prêt à protéger votre serveur?</h2>
            <p>Rejoignez des milliers de serveurs qui font confiance à RudyProtect</p>
            <a href="/invite" class="btn btn-primary btn-large">
                <i class="fab fa-discord"></i> Ajouter à Discord
            </a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>RudyProtect</h4>
                    <p>Système de protection Discord avancé</p>
                </div>
                <div class="footer-section">
                    <h4>Navigation</h4>
                    <ul>
                        <li><a href="/">Accueil</a></li>
                        <li><a href="#features">Fonctionnalités</a></li>
                        <li><a href="/dashboard">Dashboard</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Communauté</h4>
                    <ul>
                        <li><a href="#">Discord</a></li>
                        <li><a href="#">Twitter</a></li>
                        <li><a href="#">Support</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Légal</h4>
                    <ul>
                        <li><a href="#">Conditions</a></li>
                        <li><a href="#">Confidentialité</a></li>
                        <li><a href="#">Cookies</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024-2025 RudyProtect. Tous droits réservés.</p>
            </div>
        </div>
    </footer>

    <script src="/assets/js/script.js"></script>
    <script>
        // Configuration
        const config = {
            apiUrl: '<?php echo $config['apiUrl']; ?>',
            isLoggedIn: <?php echo $isLoggedIn ? 'true' : 'false'; ?>
        };
    </script>
</body>
</html>
