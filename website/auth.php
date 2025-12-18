<?php
/**
 * Système d'authentification Discord OAuth2 et gestion des tokens de captcha
 */

session_start();

// Configuration
define('DISCORD_CLIENT_ID', getenv('DISCORD_CLIENT_ID') ?: 'YOUR_CLIENT_ID_HERE');
define('DISCORD_CLIENT_SECRET', getenv('DISCORD_CLIENT_SECRET') ?: 'YOUR_CLIENT_SECRET_HERE');
define('DISCORD_REDIRECT_URI', getenv('DISCORD_REDIRECT_URI') ?: 'http://localhost:8000/auth/callback');
define('DISCORD_API_ENDPOINT', 'https://discordapp.com/api');

// ===== GÉNÉRER UN TOKEN ALÉATOIRE =====
function generateRandomToken($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

// ===== GÉNÉRER UN TOKEN CAPTCHA AVEC URL =====
function generateCaptchaToken() {
    $token = generateRandomToken(24);
    
    // Stocker le mapping token -> timestamp
    $_SESSION['captcha_tokens'] = $_SESSION['captcha_tokens'] ?? [];
    $_SESSION['captcha_tokens'][$token] = [
        'created' => time(),
        'user_id' => $_SESSION['user_id'] ?? null,
        'verified' => false
    ];
    
    return $token;
}

// ===== VALIDER UN TOKEN CAPTCHA =====
function validateCaptchaToken($token) {
    if (!isset($_SESSION['captcha_tokens'][$token])) {
        return false;
    }
    
    $tokenData = $_SESSION['captcha_tokens'][$token];
    
    // Vérifier si le token n'a pas expiré (5 minutes)
    if (time() - $tokenData['created'] > 300) {
        unset($_SESSION['captcha_tokens'][$token]);
        return false;
    }
    
    return true;
}

// ===== MARQUER UN TOKEN COMME VÉRIFIÉ =====
function markCaptchaTokenAsVerified($token) {
    if (isset($_SESSION['captcha_tokens'][$token])) {
        $_SESSION['captcha_tokens'][$token]['verified'] = true;
        $_SESSION['captcha_tokens'][$token]['verified_time'] = time();
    }
}

// ===== RÉCUPÉRER LES DONNÉES DISCORD =====
function getDiscordUser($access_token) {
    $curl = curl_init();
    
    curl_setopt_array($curl, [
        CURLOPT_URL => DISCORD_API_ENDPOINT . '/users/@me',
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $access_token,
            'User-Agent: Ginko-Bot'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    if ($httpCode !== 200) {
        return null;
    }
    
    return json_decode($response, true);
}

// ===== RÉCUPÉRER LES SERVEURS DE L'UTILISATEUR =====
function getDiscordUserGuilds($access_token) {
    $curl = curl_init();
    
    curl_setopt_array($curl, [
        CURLOPT_URL => DISCORD_API_ENDPOINT . '/users/@me/guilds',
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $access_token,
            'User-Agent: Ginko-Bot'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    if ($httpCode !== 200) {
        return [];
    }
    
    return json_decode($response, true) ?? [];
}

// ===== ROUTER LES ACTIONS =====
$action = $_GET['action'] ?? $_POST['action'] ?? null;

header('Content-Type: application/json');

switch ($action) {
    case 'discord':
        redirectToDiscordOAuth();
        break;
    
    case 'callback':
        handleDiscordCallback();
        break;
    
    case 'logout':
        handleLogout();
        break;
    
    case 'generate-captcha-token':
        generateCaptchaTokenAction();
        break;
    
    case 'verify-captcha-token':
        verifyCaptchaTokenAction();
        break;
    
    case 'get-user':
        getCurrentUserAction();
        break;
    
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Action non reconnue']);
        break;
}
// ===== REDIRIGER VERS DISCORD OAUTH =====
function redirectToDiscordOAuth() {
    $state = bin2hex(random_bytes(16));
    $_SESSION['oauth_state'] = $state;
    
    $scopes = ['identify', 'guilds', 'email'];
    $scope_string = implode('%20', $scopes);
    
    $url = DISCORD_API_ENDPOINT . '/oauth2/authorize?' . http_build_query([
        'client_id' => DISCORD_CLIENT_ID,
        'redirect_uri' => DISCORD_REDIRECT_URI,
        'response_type' => 'code',
        'scope' => $scope_string,
        'state' => $state
    ]);
    
    header('Location: ' . $url);
    exit;
}

// ===== GÉRER LE CALLBACK DISCORD =====
function handleDiscordCallback() {
    // Vérifier le state
    if (!isset($_GET['state']) || $_GET['state'] !== $_SESSION['oauth_state']) {
        http_response_code(403);
        echo json_encode(['error' => 'État invalide']);
        exit;
    }
    
    // Vérifier le code
    if (!isset($_GET['code'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Code manquant']);
        exit;
    }
    
    // Échanger le code pour un access_token
    $curl = curl_init();
    
    curl_setopt_array($curl, [
        CURLOPT_URL => DISCORD_API_ENDPOINT . '/oauth2/token',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'client_id' => DISCORD_CLIENT_ID,
            'client_secret' => DISCORD_CLIENT_SECRET,
            'grant_type' => 'authorization_code',
            'code' => $_GET['code'],
            'redirect_uri' => DISCORD_REDIRECT_URI
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    if ($httpCode !== 200) {
        http_response_code(400);
        echo json_encode(['error' => 'Erreur lors de l\'authentification Discord']);
        exit;
    }
    
    $tokenData = json_decode($response, true);
    $access_token = $tokenData['access_token'];
    
    // Récupérer les données de l'utilisateur
    $user = getDiscordUser($access_token);
    $guilds = getDiscordUserGuilds($access_token);
    
    if (!$user) {
        http_response_code(400);
        echo json_encode(['error' => 'Erreur lors de la récupération des données']);
        exit;
    }
    
    // Créer la session utilisateur
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['avatar'] = 'https://cdn.discordapp.com/avatars/' . $user['id'] . '/' . $user['avatar'] . '.png';
    $_SESSION['email'] = $user['email'];
    $_SESSION['access_token'] = $access_token;
    $_SESSION['guilds'] = $guilds;
    
    // Stocker en sessionStorage côté client
    $userData = [
        'id' => $user['id'],
        'username' => $user['username'],
        'avatar' => $_SESSION['avatar'],
        'email' => $user['email']
    ];
    
    // Rediriger vers le dashboard
    header('Location: /website/dashboard.html?user=' . urlencode(json_encode($userData)));
    exit;
}

// ===== GÉNÉRER UN TOKEN CAPTCHA =====
function generateCaptchaTokenAction() {
    // Vérifier que l'utilisateur est connecté
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Non authentifié']);
        exit;
    }
    
    $token = generateCaptchaToken();
    
    echo json_encode([
        'success' => true,
        'token' => $token,
        'url' => '/website/captcha.html?token=' . $token
    ]);
}

// ===== VÉRIFIER UN TOKEN CAPTCHA =====
function verifyCaptchaTokenAction() {
    $data = json_decode(file_get_contents('php://input'), true);
    $token = $data['token'] ?? null;
    
    if (!$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Token manquant']);
        exit;
    }
    
    if (!validateCaptchaToken($token)) {
        http_response_code(400);
        echo json_encode(['error' => 'Token invalide ou expiré']);
        exit;
    }
    
    markCaptchaTokenAsVerified($token);
    
    echo json_encode([
        'success' => true,
        'verified' => true
    ]);
}

// ===== OBTENIR L'UTILISATEUR ACTUEL =====
function getCurrentUserAction() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['authenticated' => false]);
        exit;
    }
    
    echo json_encode([
        'authenticated' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'avatar' => $_SESSION['avatar'],
            'email' => $_SESSION['email']
        ]
    ]);
}

// ===== DÉCONNEXION =====
function handleLogout() {
    // Détruire la session
    $_SESSION = [];
    session_destroy();
    
    echo json_encode(['success' => true]);
    exit;
}

?>
    }

    $auth = new DiscordAuth($clientId, $clientSecret, $redirectUrl);
    $loginUrl = $auth->getLoginUrl();

    header('Location: ' . $loginUrl);
    exit;
}

function handleCallback() {
    global $clientId, $clientSecret, $redirectUrl;

    if (!isset($_GET['code'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Code manquant']);
        return;
    }

    // Vérifier le state
    if (!isset($_SESSION['oauth_state']) || $_SESSION['oauth_state'] !== ($_GET['state'] ?? '')) {
        http_response_code(400);
        echo json_encode(['error' => 'State invalide']);
        return;
    }

    $auth = new DiscordAuth($clientId, $clientSecret, $redirectUrl);
    $tokenData = $auth->exchangeCode($_GET['code']);

    if (!isset($tokenData['access_token'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Erreur OAuth', 'details' => $tokenData]);
        return;
    }

    $user = $auth->getUser($tokenData['access_token']);
    $guilds = $auth->getGuilds($tokenData['access_token']);

    // Sauvegarder en session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['username'];
    $_SESSION['user_email'] = $user['email'] ?? '';
    $_SESSION['user_avatar'] = $user['avatar'];
    $_SESSION['access_token'] = $tokenData['access_token'];
    $_SESSION['refresh_token'] = $tokenData['refresh_token'] ?? '';
    $_SESSION['user_guilds'] = $guilds;

    // Redirection
    header('Location: /website/');
    exit;
}

function handleLogout() {
    session_destroy();
    header('Location: /website/');
    exit;
}

function handleUser() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Non authentifié']);
        return;
    }

    echo json_encode([
        'id' => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'],
        'email' => $_SESSION['user_email'],
        'avatar' => $_SESSION['user_avatar']
    ]);
}

function handleGuilds() {
    if (!isset($_SESSION['user_guilds'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Non authentifié']);
        return;
    }

    // Filtrer les serveurs avec permissions admin
    $adminGuilds = array_filter($_SESSION['user_guilds'], function($guild) {
        // Vérifier si l'utilisateur est propriétaire ou a les permissions
        return isset($guild['owner']) && $guild['owner'] == true;
    });

    echo json_encode([
        'guilds' => array_values($adminGuilds),
        'total' => count($adminGuilds)
    ]);
}

?>
