<?php
/**
 * Quick Start - Page de test du Dashboard
 * Permet de vérifier rapidement le fonctionnement du système
 */

session_start();
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RudyProtect - Quick Start</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            max-width: 900px;
            width: 100%;
            padding: 40px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .header h1 {
            color: #667eea;
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .header p {
            color: #666;
            font-size: 1.1rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .card-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }

        .card h3 {
            margin-bottom: 10px;
        }

        .card p {
            font-size: 0.9rem;
            opacity: 0.9;
        }

        .status-grid {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px;
            margin-bottom: 10px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }

        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #28a745;
            box-shadow: 0 0 10px #28a745;
        }

        .status-indicator.error {
            background: #f04747;
            box-shadow: 0 0 10px #f04747;
        }

        .status-item strong {
            flex: 1;
            color: #333;
        }

        .status-value {
            color: #667eea;
            font-weight: bold;
        }

        .console {
            background: #1e1e1e;
            color: #00ff00;
            padding: 20px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 20px;
        }

        .console-line {
            margin-bottom: 5px;
        }

        .console-line.success {
            color: #00ff00;
        }

        .console-line.error {
            color: #ff4444;
        }

        .console-line.warning {
            color: #ffaa00;
        }

        .console-line.info {
            color: #00ccff;
        }

        .buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
        }

        button {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }

        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .alert-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ RudyProtect Quick Start</h1>
            <p>Page de test et vérification du système</p>
        </div>

        <div id="alert" class="alert"></div>

        <div class="status-grid">
            <h3 style="margin-bottom: 15px; color: #333;">📊 État du Système</h3>
            <div class="status-item">
                <div class="status-indicator"></div>
                <strong>Serveur PHP</strong>
                <span class="status-value"><?php echo phpversion(); ?></span>
            </div>
            <div class="status-item">
                <div class="status-indicator <?php echo extension_loaded('curl') ? '' : 'error'; ?>"></div>
                <strong>Extension cURL</strong>
                <span class="status-value"><?php echo extension_loaded('curl') ? '✓ Activée' : '✗ Non activée'; ?></span>
            </div>
            <div class="status-item">
                <div class="status-indicator <?php echo extension_loaded('json') ? '' : 'error'; ?>"></div>
                <strong>Extension JSON</strong>
                <span class="status-value"><?php echo extension_loaded('json') ? '✓ Activée' : '✗ Non activée'; ?></span>
            </div>
            <div class="status-item">
                <div class="status-indicator <?php echo extension_loaded('pdo') ? '' : 'error'; ?>"></div>
                <strong>Extension PDO</strong>
                <span class="status-value"><?php echo extension_loaded('pdo') ? '✓ Activée' : '✗ Non activée'; ?></span>
            </div>
            <div class="status-item">
                <div class="status-indicator"></div>
                <strong>Dossier Session</strong>
                <span class="status-value"><?php echo is_writable(session_save_path()) ? '✓ Accessible' : '✗ Non accessible'; ?></span>
            </div>
        </div>

        <div class="grid">
            <a href="/website/" class="card">
                <div class="card-icon">🌐</div>
                <h3>Dashboard</h3>
                <p>Accéder au tableau de bord principal</p>
            </a>

            <a href="/website/api.php" class="card">
                <div class="card-icon">⚙️</div>
                <h3>API</h3>
                <p>Tester les endpoints API</p>
            </a>

            <a href="/website/Captcha/captcha.php?action=generate" class="card">
                <div class="card-icon">🔐</div>
                <h3>CAPTCHA</h3>
                <p>Générer un nouveau CAPTCHA</p>
            </a>
        </div>

        <h3 style="margin-bottom: 15px; color: #333;">🧪 Tests</h3>
        <div class="console" id="console"></div>

        <div class="buttons">
            <button class="btn-primary" onclick="testAPI()">Test API</button>
            <button class="btn-primary" onclick="testCaptcha()">Test CAPTCHA</button>
            <button class="btn-primary" onclick="testDatabase()">Test BD</button>
            <button class="btn-secondary" onclick="clearConsole()">Effacer</button>
        </div>
    </div>

    <script>
        function log(message, type = 'info') {
            const console_el = document.getElementById('console');
            const line = document.createElement('div');
            line.className = `console-line ${type}`;
            line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console_el.appendChild(line);
            console_el.scrollTop = console_el.scrollHeight;
        }

        function showAlert(message, type) {
            const alert = document.getElementById('alert');
            alert.textContent = message;
            alert.className = `alert alert-${type}`;
            alert.style.display = 'block';
            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000);
        }

        function clearConsole() {
            document.getElementById('console').innerHTML = '';
        }

        async function testAPI() {
            log('Démarrage du test API...', 'info');
            try {
                const response = await fetch('/website/api.php?action=stats');
                if (response.ok) {
                    const data = await response.json();
                    log('✓ API Stats: ' + JSON.stringify(data), 'success');
                } else {
                    log('✗ Erreur API: ' + response.statusText, 'error');
                }
            } catch (error) {
                log('✗ Erreur: ' + error.message, 'error');
            }
        }

        async function testCaptcha() {
            log('Démarrage du test CAPTCHA...', 'info');
            try {
                const response = await fetch('/website/Captcha/captcha.php?action=generate', {
                    method: 'POST'
                });
                if (response.ok) {
                    const data = await response.json();
                    log('✓ CAPTCHA généré: ' + data.code, 'success');
                    showAlert('CAPTCHA généré avec succès', 'success');
                } else {
                    log('✗ Erreur CAPTCHA: ' + response.statusText, 'error');
                }
            } catch (error) {
                log('✗ Erreur: ' + error.message, 'error');
            }
        }

        async function testDatabase() {
            log('Test de la base de données...', 'warning');
            log('Note: Assurez-vous que MySQL est en cours d\'exécution', 'warning');
            log('Voir INSTALLATION.md pour la configuration', 'info');
        }

        // Test initial
        window.addEventListener('load', () => {
            log('🚀 RudyProtect Quick Start chargé', 'success');
            log('Version: 1.0.0', 'info');
        });
    </script>
</body>
</html>
