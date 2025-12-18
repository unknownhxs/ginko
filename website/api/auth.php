<?php
/**
 * Endpoints d'authentification Discord OAuth2
 * API/auth/discord/...
 */

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/middleware.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route: /api/auth/discord
if (strpos($path, '/auth/discord/authorize') !== false && $method === 'GET') {
    authDiscordAuthorize();
}
// Route: /api/auth/discord/callback
elseif (strpos($path, '/auth/discord/callback') !== false && $method === 'GET') {
    authDiscordCallback();
}
// Route: /api/auth/me
elseif (strpos($path, '/auth/me') !== false && $method === 'GET') {
    authGetMe();
}
// Route: /api/auth/logout
elseif (strpos($path, '/auth/logout') !== false && $method === 'POST') {
    authLogout();
}
else {
    jsonResponse(['error' => 'Endpoint not found'], 404);
}

/**
 * Redirection OAuth2 Discord
 */
function authDiscordAuthorize() {
    checkRateLimit('discord_auth');

    $scopes = ['identify', 'email', 'guilds'];
    $scope = implode('%20', $scopes);
    $redirectUri = urlencode(DISCORD_REDIRECT_URI);
    
    $authUrl = 'https://discord.com/api/oauth2/authorize?' .
        'client_id=' . DISCORD_CLIENT_ID .
        '&redirect_uri=' . $redirectUri .
        '&response_type=code' .
        '&scope=' . $scope;

    logAction('auth', 'discord_authorize', null, getClientIP());
    jsonResponse(['url' => $authUrl]);
}

/**
 * Callback OAuth2 Discord
 */
function authDiscordCallback() {
    checkRateLimit('discord_callback');

    $code = $_GET['code'] ?? null;
    if (!$code) {
        jsonResponse(['error' => 'Authorization code not provided'], 400);
    }

    try {
        // Échanger le code pour un token
        $ch = curl_init('https://discord.com/api/oauth2/token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, [
            'client_id' => DISCORD_CLIENT_ID,
            'client_secret' => DISCORD_CLIENT_SECRET,
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => DISCORD_REDIRECT_URI,
        ]);
        $tokenResponse = curl_exec($ch);
        curl_close($ch);

        $tokenData = json_decode($tokenResponse, true);
        if (!isset($tokenData['access_token'])) {
            jsonResponse(['error' => 'Failed to get access token'], 401);
        }

        // Récupérer les infos utilisateur
        $ch = curl_init('https://discord.com/api/users/@me');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $tokenData['access_token']
        ]);
        $userResponse = curl_exec($ch);
        curl_close($ch);

        $userData = json_decode($userResponse, true);
        if (!isset($userData['id'])) {
            jsonResponse(['error' => 'Failed to get user data'], 401);
        }

        // Récupérer les serveurs Discord
        $ch = curl_init('https://discord.com/api/users/@me/guilds');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $tokenData['access_token']
        ]);
        $guildsResponse = curl_exec($ch);
        curl_close($ch);

        $guilds = json_decode($guildsResponse, true) ?? [];

        // Hasher les données
        $userIdHash = hashData($userData['id']);
        $emailHash = hashData($userData['email'] ?? '');
        $ip = getClientIP();

        $pdo = getPDO();

        // Vérifier si multi-compte détecté (même IP, user_id différent)
        $stmt = $pdo->prepare('
            SELECT user_id_hash FROM captcha_verification
            WHERE ip_address = :ip AND user_id_hash != :user_id_hash
            LIMIT 1
        ');
        $stmt->execute([':ip' => $ip, ':user_id_hash' => $userIdHash]);
        $oldAccount = $stmt->fetch();

        if ($oldAccount) {
            // Multi-compte détecté - kick ancien compte
            $oldUserId = $oldAccount['user_id_hash'];
            
            // Appeler bot pour kick
            callBotAPI('/api/kick-user', 'POST', [
                'user_id_hash' => $oldUserId,
                'reason' => 'multi-account detected',
            ]);

            // Ajouter ancien compte à blacklist
            $stmt = $pdo->prepare('
                INSERT INTO blacklist_id (user_id_hash, reason, is_permanent)
                VALUES (:user_id_hash, :reason, TRUE)
                ON CONFLICT (user_id_hash) DO NOTHING
            ');
            $stmt->execute([
                ':user_id_hash' => $oldUserId,
                ':reason' => 'multi-account attempt',
            ]);

            logAction('auth', 'multiaccount_detected', $userIdHash, $ip);
        }

        // Vérifier email Discord vs email captcha
        $stmt = $pdo->prepare('
            SELECT attempt_count, email_hash FROM captcha_verification
            WHERE user_id_hash = :user_id_hash
            ORDER BY created_at DESC
            LIMIT 1
        ');
        $stmt->execute([':user_id_hash' => $userIdHash]);
        $existingVerification = $stmt->fetch();

        if ($existingVerification) {
            // Vérifier si email Discord match email captcha
            if ($existingVerification['email_hash'] !== $emailHash) {
                // Email mismatch - incrémenter tentatives
                $newAttemptCount = $existingVerification['attempt_count'] + 1;
                
                if ($newAttemptCount >= MAX_MULTIACCOUNT_ATTEMPTS) {
                    // Blacklister pour tentatives multiples
                    $stmt = $pdo->prepare('
                        INSERT INTO blacklist_id (user_id_hash, reason, is_permanent)
                        VALUES (:user_id_hash, :reason, TRUE)
                        ON CONFLICT (user_id_hash) DO NOTHING
                    ');
                    $stmt->execute([
                        ':user_id_hash' => $userIdHash,
                        ':reason' => 'email mismatch attempts',
                    ]);

                    callBotAPI('/api/kick-user', 'POST', [
                        'user_id_hash' => $userIdHash,
                        'reason' => 'email mismatch - blacklisted',
                    ]);

                    logAction('auth', 'blacklist_email_mismatch', $userIdHash, $ip);
                    jsonResponse(['error' => 'Email mismatch - account blacklisted', 'blocked' => true], 403);
                }

                // Mettre à jour tentatives
                $stmt = $pdo->prepare('
                    UPDATE captcha_verification
                    SET attempt_count = :attempt_count
                    WHERE user_id_hash = :user_id_hash
                ');
                $stmt->execute([
                    ':attempt_count' => $newAttemptCount,
                    ':user_id_hash' => $userIdHash,
                ]);

                logAction('auth', 'email_mismatch', $userIdHash, $ip, "Attempt $newAttemptCount");
                jsonResponse(['error' => 'Email mismatch. Attempt ' . $newAttemptCount . ' of ' . MAX_MULTIACCOUNT_ATTEMPTS], 401);
            }
        }

        // Extraire serveurs où l'utilisateur est admin (permission 8 = administrator)
        $adminGuilds = array_filter($guilds, function($guild) {
            return ($guild['permissions'] & 8) === 8; // Permission ADMINISTRATOR
        });

        // Enregistrer admin pour chaque serveur
        foreach ($adminGuilds as $guild) {
            $stmt = $pdo->prepare('
                INSERT INTO guild_admins (user_id_hash, guild_id, can_edit_config)
                VALUES (:user_id_hash, :guild_id, TRUE)
                ON CONFLICT (user_id_hash, guild_id) DO NOTHING
            ');
            $stmt->execute([
                ':user_id_hash' => $userIdHash,
                ':guild_id' => $guild['id'],
            ]);
        }

        // Générer JWT
        $jwt = generateJWT([
            'user_id_hash' => $userIdHash,
            'email_hash' => $emailHash,
            'discord_id' => $userData['id'],
            'username' => $userData['username'],
            'avatar' => $userData['avatar'],
            'admin_guilds' => array_map(fn($g) => ['id' => $g['id'], 'name' => $g['name'], 'icon' => $g['icon']], $adminGuilds),
            'all_guilds' => array_map(fn($g) => ['id' => $g['id'], 'name' => $g['name'], 'icon' => $g['icon']], $guilds),
        ]);

        logAction('auth', 'discord_login_success', $userIdHash, $ip);
        jsonResponse([
            'success' => true,
            'token' => $jwt,
            'user' => [
                'username' => $userData['username'],
                'avatar' => $userData['avatar'],
                'email' => $userData['email'],
                'admin_guilds' => array_map(fn($g) => ['id' => $g['id'], 'name' => $g['name']], $adminGuilds),
            ],
        ]);

    } catch (Exception $e) {
        logAction('auth', 'discord_callback_error', null, getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'Authentication failed'], 500);
    }
}

/**
 * Récupérer données utilisateur actuellement connecté
 */
function authGetMe() {
    $payload = validateBearerToken();
    if (!$payload) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    jsonResponse([
        'user' => [
            'user_id_hash' => $payload['user_id_hash'],
            'username' => $payload['username'],
            'avatar' => $payload['avatar'],
            'admin_guilds' => $payload['admin_guilds'] ?? [],
        ],
    ]);
}

/**
 * Logout (invalider JWT côté client simplement)
 */
function authLogout() {
    $payload = validateBearerToken();
    if (!$payload) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    logAction('auth', 'logout', $payload['user_id_hash'] ?? null, getClientIP());
    jsonResponse(['success' => true, 'message' => 'Logged out']);
}
?>
