<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration
$config = [
    'db_host' => getenv('DB_HOST') ?: 'localhost',
    'db_user' => getenv('DB_USER') ?: 'root',
    'db_pass' => getenv('DB_PASS') ?: '',
    'db_name' => getenv('DB_NAME') ?: 'rudyprotect'
];

// Connexion à la base de données
try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']}",
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Routeur API
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api/', '', $requestUri);

// Router
$route = explode('/', trim($path, '/'));
$action = $route[0] ?? '';
$subaction = $route[1] ?? '';

switch ($action) {
    case 'captcha':
        handleCaptcha($subaction);
        break;
    case 'stats':
        handleStats();
        break;
    case 'servers':
        handleServers();
        break;
    case 'incidents':
        handleIncidents();
        break;
    case 'blacklist':
        handleBlacklist();
        break;
    case 'reports':
        handleReports();
        break;
    case 'export':
        handleExport();
        break;
    case 'user':
        handleUser();
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Route non trouvée']);
        break;
}

// ===== CAPTCHA HANDLERS =====

function handleCaptcha($subaction) {
    global $pdo;
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $subaction === 'generate') {
        generateCaptcha();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $subaction === 'verify') {
        verifyCaptcha($pdo);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
    }
}

function generateCaptcha() {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 6; $i++) {
        $code .= $chars[rand(0, strlen($chars) - 1)];
    }
    
    $sessionId = uniqid('captcha_', true);
    $_SESSION[$sessionId] = [
        'code' => $code,
        'created' => time(),
        'attempts' => 0
    ];
    
    echo json_encode([
        'sessionId' => $sessionId,
        'code' => $code,
        'display' => addVisualNoise($code)
    ]);
}

function addVisualNoise($code) {
    $chars = str_split($code);
    $result = '';
    foreach ($chars as $char) {
        $spaces = rand(0, 1) ? ' ' : '';
        $result .= $spaces . $char;
    }
    return $result;
}

function verifyCaptcha($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['code']) || !isset($input['expected'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Données invalides']);
        return;
    }
    
    $userCode = strtoupper(trim($input['code']));
    $expected = strtoupper($input['expected']);
    $isValid = ($userCode === $expected);
    
    echo json_encode([
        'valid' => $isValid,
        'message' => $isValid ? 'Code valide' : 'Code invalide'
    ]);
}

// ===== STATS HANDLERS =====

function handleStats() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        return;
    }
    
    // Retourner des statistiques simulées
    echo json_encode([
        'members' => rand(1000, 5000),
        'servers' => rand(50, 500),
        'threats' => rand(100, 10000),
        'uptime' => 99.9,
        'timestamp' => date('c')
    ]);
}

// ===== SERVER HANDLERS =====

function handleServers() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        return;
    }
    
    // Données simulées
    $servers = [
        ['id' => 1, 'name' => 'Mon Serveur', 'memberCount' => 250, 'protected' => true, 'icon' => '🎮'],
        ['id' => 2, 'name' => 'Serveur Gaming', 'memberCount' => 1500, 'protected' => true, 'icon' => '🏆'],
        ['id' => 3, 'name' => 'Communauté', 'memberCount' => 800, 'protected' => false, 'icon' => '👥']
    ];
    
    echo json_encode([
        'servers' => $servers,
        'total' => count($servers)
    ]);
}

// ===== INCIDENTS HANDLERS =====

function handleIncidents() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        return;
    }
    
    // Données simulées
    $incidents = [
        [
            'id' => 1,
            'type' => 'raid',
            'title' => 'Tentative de raid détectée',
            'severity' => 'high',
            'timestamp' => date('c', strtotime('-5 minutes'))
        ],
        [
            'id' => 2,
            'type' => 'spam',
            'title' => 'Spam détecté',
            'severity' => 'medium',
            'timestamp' => date('c', strtotime('-2 hours'))
        ],
        [
            'id' => 3,
            'type' => 'warning',
            'title' => 'Utilisateur suspect identifié',
            'severity' => 'low',
            'timestamp' => date('c', strtotime('-1 day'))
        ]
    ];
    
    echo json_encode([
        'incidents' => $incidents,
        'total' => count($incidents)
    ]);
}

// ===== BLACKLIST HANDLERS =====

function handleBlacklist() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        return;
    }
    
    echo json_encode([
        'ips' => [],
        'ids' => [],
        'total' => 0
    ]);
}

// ===== REPORTS HANDLERS =====

function handleReports() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        return;
    }
    
    echo json_encode([
        'reports' => [],
        'total' => 0
    ]);
}

// ===== EXPORT HANDLERS =====

function handleExport() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        return;
    }
    
    $data = [
        'exported_at' => date('c'),
        'version' => '1.0.0',
        'stats' => [
            'members' => rand(1000, 5000),
            'servers' => rand(50, 500),
            'incidents' => rand(10, 100)
        ]
    ];
    
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="rudyprotect-export-' . date('Y-m-d') . '.json"');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

// ===== USER HANDLERS =====

function handleUser() {
    global $pdo;
    
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Non authentifié']);
        return;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Récupérer les infos de l'utilisateur
        echo json_encode([
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name'],
            'email' => $_SESSION['user_email']
        ]);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
    }
}

// Fonction utilitaire pour la réponse JSON
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
}
?>
