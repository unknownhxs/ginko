<?php
/**
 * Endpoints Blacklist
 * /api/blacklist/...
 */

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/middleware.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route: GET /api/blacklist
if ($method === 'GET' && strpos($path, '/blacklist') !== false && strpos($path, '/blacklist/') === false) {
    blacklistGet();
}
// Route: POST /api/blacklist/add
elseif ($method === 'POST' && strpos($path, '/blacklist/add') !== false) {
    blacklistAdd();
}
// Route: POST /api/blacklist/remove
elseif ($method === 'POST' && strpos($path, '/blacklist/remove') !== false) {
    blacklistRemove();
}
else {
    jsonResponse(['error' => 'Endpoint not found'], 404);
}

/**
 * Récupérer liste blacklist (admin seulement)
 */
function blacklistGet() {
    $payload = validateBearerToken();
    if (!$payload) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    checkRateLimit('blacklist_get');

    $guildId = $_GET['guild_id'] ?? null;
    if (!$guildId) {
        jsonResponse(['error' => 'guild_id required'], 400);
    }

    $guildId = (int)$guildId;

    try {
        $pdo = getPDO();

        // Vérifier si admin sur ce serveur
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

        // Récupérer blacklist
        $stmt = $pdo->prepare('
            SELECT id, user_id_hash, reason, created_at FROM blacklist_id
            WHERE guild_id = :guild_id OR guild_id IS NULL
            ORDER BY created_at DESC
            LIMIT 100
        ');
        $stmt->execute([':guild_id' => $guildId]);
        $blacklist = $stmt->fetchAll();

        jsonResponse(['blacklist' => $blacklist]);

    } catch (Exception $e) {
        logAction('blacklist', 'get_error', $payload['user_id_hash'], getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'Failed to fetch blacklist'], 500);
    }
}

/**
 * Ajouter à blacklist (admin seulement)
 */
function blacklistAdd() {
    $payload = validateBearerToken();
    if (!$payload) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    checkRateLimit('blacklist_add');

    $data = validatePostData(['guild_id', 'user_id_hash', 'reason']);
    $guildId = (int)$data['guild_id'];
    $userIdHash = sanitizeInput($data['user_id_hash']);
    $reason = sanitizeInput($data['reason']);

    try {
        $pdo = getPDO();

        // Vérifier admin
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

        // Ajouter à blacklist
        $stmt = $pdo->prepare('
            INSERT INTO blacklist_id (user_id_hash, guild_id, reason, is_permanent)
            VALUES (:user_id_hash, :guild_id, :reason, TRUE)
            ON CONFLICT (user_id_hash) DO NOTHING
        ');
        $stmt->execute([
            ':user_id_hash' => $userIdHash,
            ':guild_id' => $guildId,
            ':reason' => $reason,
        ]);

        // Log action
        logAction('blacklist', 'add', $payload['user_id_hash'], getClientIP(), [
            'target_user' => $userIdHash,
            'reason' => $reason,
        ]);

        jsonResponse(['success' => true, 'message' => 'User added to blacklist']);

    } catch (Exception $e) {
        logAction('blacklist', 'add_error', $payload['user_id_hash'], getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'Failed to add to blacklist'], 500);
    }
}

/**
 * Retirer de blacklist (admin seulement)
 */
function blacklistRemove() {
    $payload = validateBearerToken();
    if (!$payload) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    checkRateLimit('blacklist_remove');

    $data = validatePostData(['guild_id', 'user_id_hash']);
    $guildId = (int)$data['guild_id'];
    $userIdHash = sanitizeInput($data['user_id_hash']);

    try {
        $pdo = getPDO();

        // Vérifier admin
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

        // Note: On ne supprime JAMAIS, on marque comme invalide
        // La table est append-only
        $stmt = $pdo->prepare('
            UPDATE blacklist_id SET is_permanent = FALSE
            WHERE user_id_hash = :user_id_hash
        ');
        $stmt->execute([':user_id_hash' => $userIdHash]);

        logAction('blacklist', 'remove', $payload['user_id_hash'], getClientIP(), ['target_user' => $userIdHash]);
        jsonResponse(['success' => true, 'message' => 'User removed from blacklist']);

    } catch (Exception $e) {
        logAction('blacklist', 'remove_error', $payload['user_id_hash'], getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'Failed to remove from blacklist'], 500);
    }
}
?>
