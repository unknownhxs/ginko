<?php
/**
 * Routeur API REST principal
 * Point d'entrée: /api/index.php
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = array_filter(explode('/', $path));

// Routing
if (in_array('auth', $pathParts)) {
    require_once __DIR__ . '/auth.php';
} elseif (in_array('captcha', $pathParts)) {
    require_once __DIR__ . '/captcha.php';
} elseif (in_array('blacklist', $pathParts)) {
    require_once __DIR__ . '/blacklist.php';
} elseif (in_array('reports', $pathParts)) {
    require_once __DIR__ . '/reports.php';
} elseif (in_array('stats', $pathParts)) {
    require_once __DIR__ . '/stats.php';
} elseif (in_array('init-db', $pathParts)) {
    require_once __DIR__ . '/init-db.php';
} else {
    jsonResponse(['error' => 'API endpoint not found', 'path' => $path], 404);
}
?>
