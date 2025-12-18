<?php
/**
 * Endpoints Reports
 * /api/reports/...
 */

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/middleware.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route: GET /api/reports
if ($method === 'GET' && strpos($path, '/reports') !== false && strpos($path, '/reports/') === false) {
    reportsGet();
}
// Route: POST /api/reports/create
elseif ($method === 'POST' && strpos($path, '/reports/create') !== false) {
    reportsCreate();
}
else {
    jsonResponse(['error' => 'Endpoint not found'], 404);
}

/**
 * Récupérer signalements (admin seulement)
 */
function reportsGet() {
    $payload = validateBearerToken();
    if (!$payload) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    checkRateLimit('reports_get');

    $guildId = $_GET['guild_id'] ?? null;
    if (!$guildId) {
        jsonResponse(['error' => 'guild_id required'], 400);
    }

    $guildId = (int)$guildId;

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

        // Récupérer signalements
        $stmt = $pdo->prepare('
            SELECT id, guild_id, reporter_id, report_type, description, evidence, created_at FROM report
            WHERE guild_id = :guild_id
            ORDER BY created_at DESC
            LIMIT 100
        ');
        $stmt->execute([':guild_id' => $guildId]);
        $reports = $stmt->fetchAll();

        jsonResponse(['reports' => $reports]);

    } catch (Exception $e) {
        logAction('reports', 'get_error', $payload['user_id_hash'], getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'Failed to fetch reports'], 500);
    }
}

/**
 * Créer signalement
 */
function reportsCreate() {
    checkRateLimit('reports_create');

    $data = validatePostData(['guild_id', 'report_type', 'description']);
    $guildId = (int)$data['guild_id'];
    $reportType = sanitizeInput($data['report_type']);
    $description = sanitizeInput($data['description']);
    $evidence = sanitizeInput($data['evidence'] ?? '');

    try {
        $pdo = getPDO();

        // Insérer signalement
        $stmt = $pdo->prepare('
            INSERT INTO report (guild_id, report_type, description, evidence, created_at)
            VALUES (:guild_id, :report_type, :description, :evidence, NOW())
        ');
        $stmt->execute([
            ':guild_id' => $guildId,
            ':report_type' => $reportType,
            ':description' => $description,
            ':evidence' => $evidence,
        ]);

        logAction('reports', 'create', null, getClientIP(), [
            'type' => $reportType,
            'guild' => $guildId,
        ]);

        jsonResponse(['success' => true, 'message' => 'Report created']);

    } catch (Exception $e) {
        logAction('reports', 'create_error', null, getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'Failed to create report'], 500);
    }
}
?>
