<?php
/**
 * Discord OAuth Integration
 * Authentification via Discord
 */

session_start();
header('Content-Type: application/json');

// Configuration
$clientId = getenv('DISCORD_CLIENT_ID') ?: '';
$clientSecret = getenv('DISCORD_CLIENT_SECRET') ?: '';
$redirectUrl = getenv('DISCORD_REDIRECT_URL') ?: 'http://localhost:8000/auth/callback';

// Endpoints Discord
define('DISCORD_API', 'https://discordapp.com/api/v10');
define('DISCORD_AUTH_URL', 'https://discord.com/api/oauth2/authorize');
define('DISCORD_TOKEN_URL', DISCORD_API . '/oauth2/token');
define('DISCORD_USER_URL', DISCORD_API . '/users/@me');
define('DISCORD_GUILDS_URL', DISCORD_API . '/users/@me/guilds');

class DiscordAuth {
    private $clientId;
    private $clientSecret;
    private $redirectUrl;

    public function __construct($clientId, $clientSecret, $redirectUrl) {
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
        $this->redirectUrl = $redirectUrl;
    }

    /**
     * Obtenir l'URL de connexion
     */
    public function getLoginUrl($state = null) {
        if (!$state) {
            $state = bin2hex(random_bytes(16));
            $_SESSION['oauth_state'] = $state;
        }

        $params = [
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUrl,
            'response_type' => 'code',
            'scope' => 'identify email guilds',
            'state' => $state
        ];

        return DISCORD_AUTH_URL . '?' . http_build_query($params);
    }

    /**
     * Échanger le code pour un token
     */
    public function exchangeCode($code) {
        $post_data = [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUrl,
            'scope' => 'identify email guilds'
        ];

        $ch = curl_init(DISCORD_TOKEN_URL);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }

    /**
     * Récupérer les infos utilisateur
     */
    public function getUser($accessToken) {
        $ch = curl_init(DISCORD_USER_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'User-Agent: RudyProtect'
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }

    /**
     * Récupérer les serveurs de l'utilisateur
     */
    public function getGuilds($accessToken) {
        $ch = curl_init(DISCORD_GUILDS_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'User-Agent: RudyProtect'
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }

    /**
     * Vérifier les permissions
     */
    public function hasAdminPermissions($guild, $userId) {
        // Vérifier si l'utilisateur est propriétaire
        return isset($guild['owner']) && $guild['owner'] == true;
    }
}

// Routeur
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'callback':
        handleCallback();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'user':
        handleUser();
        break;
    case 'guilds':
        handleGuilds();
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Action non valide']);
}

// ===== HANDLERS =====

function handleLogin() {
    global $clientId, $clientSecret, $redirectUrl;

    if (!$clientId || !$clientSecret) {
        http_response_code(500);
        echo json_encode(['error' => 'Discord OAuth non configuré']);
        return;
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
