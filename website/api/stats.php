<?php
/**
 * Endpoints Stats et données du serveur
 * /api/stats/...
 */

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/middleware.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route: GET /api/stats
if ($method === 'GET' && strpos($path, '/stats') !== false && strpos($path, '/stats/') === false) {
    statsGet();
}
// Route: GET /api/stats/guild/:guild_id
elseif ($method === 'GET' && strpos($path, '/stats/guild') !== false) {
    statsGetGuild();
}
else {
    jsonResponse(['error' => 'Endpoint not found'], 404);
}

/**
 * Récupérer statistiques globales
 */
function statsGet() {
    $payload = validateBearerToken();
    if (!$payload) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    checkRateLimit('stats_get');

    try {
        $pdo = getPDO();

        // Statistiques globales
        $totalCaptchas = $pdo->query('SELECT COUNT(*) as count FROM captcha_verification')->fetch()['count'];
        $totalReports = $pdo->query('SELECT COUNT(*) as count FROM report')->fetch()['count'];
        $blacklistedUsers = $pdo->query('SELECT COUNT(*) as count FROM blacklist_id WHERE is_permanent = TRUE')->fetch()['count'];
        $adminServers = $pdo->prepare('
            SELECT COUNT(DISTINCT guild_id) as count FROM guild_admins
            WHERE user_id_hash = :user_id_hash
        ');
        $adminServers->execute([':user_id_hash' => $payload['user_id_hash']]);
        $adminServersCount = $adminServers->fetch()['count'];

        jsonResponse([
            'stats' => [
                'total_captchas_verified' => (int)$totalCaptchas,
                'total_reports' => (int)$totalReports,
                'total_blacklisted' => (int)$blacklistedUsers,
                'admin_servers' => (int)$adminServersCount,
            ],
        ]);

    } catch (Exception $e) {
        logAction('stats', 'get_error', $payload['user_id_hash'], getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'Failed to fetch stats'], 500);
    }
}

/**
 * Récupérer statistiques serveur
 */
function statsGetGuild() {
    $payload = validateBearerToken();
    if (!$payload) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    checkRateLimit('stats_guild');

    $guildId = $_GET['guild_id'] ?? null;
    if (!$guildId) {
        jsonResponse(['error' => 'guild_id required'], 400);
    }

    $guildId = (int)$guildId;

    try {
        $pdo = getPDO();

        // Vérifier si admin
        $stmt = $pdo->prepare('
            SELECT can_edit_config FROM guild_admins
            WHERE user_id_hash = :user_id_hash AND guild_id = :guild_id
        ');
        $stmt->execute([
            ':user_id_hash' => $payload['user_id_hash'],
            ':guild_id' => $guildId,
        ]);
        
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Not admin on this server'], 403);
        }

        // Stats du serveur
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM captcha_verification WHERE guild_id = :guild_id');
        $stmt->execute([':guild_id' => $guildId]);
        $captchasOnGuild = $stmt->fetch()['count'];

        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM report WHERE guild_id = :guild_id');
        $stmt->execute([':guild_id' => $guildId]);
        $reportsOnGuild = $stmt->fetch()['count'];

        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM blacklist_id WHERE guild_id = :guild_id AND is_permanent = TRUE');
        $stmt->execute([':guild_id' => $guildId]);
        $blacklistedOnGuild = $stmt->fetch()['count'];

        // Dernières tentatives captcha
        $stmt = $pdo->prepare('
            SELECT user_id_hash, success, created_at FROM captcha_attempts
            WHERE guild_id = :guild_id
            ORDER BY created_at DESC
            LIMIT 20
        ');
        $stmt->execute([':guild_id' => $guildId]);
        $recentAttempts = $stmt->fetchAll();

        jsonResponse([
            'guild_id' => $guildId,
            'stats' => [
                'captchas_verified' => (int)$captchasOnGuild,
                'reports' => (int)$reportsOnGuild,
                'blacklisted' => (int)$blacklistedOnGuild,
            ],
            'recent_attempts' => $recentAttempts,
        ]);

    } catch (Exception $e) {
        logAction('stats', 'guild_error', $payload['user_id_hash'], getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'Failed to fetch guild stats'], 500);
    }
}
?>
