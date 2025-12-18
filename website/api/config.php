<?php
/**
 * Configuration et connexion PostgreSQL
 * Fichier centralisé pour l'API RudyProtect
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Variables d'environnement
$dotenv = __DIR__ . '/../../.env';
if (file_exists($dotenv)) {
    $lines = file($dotenv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && $line[0] !== '#') {
            [$key, $value] = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value, '"\'');
        }
    }
}

// Connexion PostgreSQL
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_PORT', $_ENV['DB_PORT'] ?? '5432');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'rudyprotect');
define('DB_USER', $_ENV['DB_USER'] ?? 'postgres');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');

// Clés sécurité
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-in-production');
define('API_SECRET_TOKEN', $_ENV['API_SECRET_TOKEN'] ?? 'your-api-token-for-bot-communication');
define('DISCORD_CLIENT_ID', $_ENV['DISCORD_CLIENT_ID'] ?? '');
define('DISCORD_CLIENT_SECRET', $_ENV['DISCORD_CLIENT_SECRET'] ?? '');
define('DISCORD_REDIRECT_URI', $_ENV['DISCORD_REDIRECT_URI'] ?? 'http://localhost:8080/api/auth/discord/callback');

// Service OTP (SendGrid ou Mailgun)
define('MAILGUN_API_KEY', $_ENV['MAILGUN_API_KEY'] ?? '');
define('MAILGUN_DOMAIN', $_ENV['MAILGUN_DOMAIN'] ?? '');
define('BOT_API_URL', $_ENV['BOT_API_URL'] ?? 'http://us-tx-dal.hostbu.com:5008');

// Configuration de sécurité
define('JWT_EXPIRY', 3600); // 1 heure
define('OTP_EXPIRY', 600); // 10 minutes
define('MAX_CAPTCHA_ATTEMPTS', 3);
define('MAX_MULTIACCOUNT_ATTEMPTS', 5);
define('RATE_LIMIT_ATTEMPTS', 20);
define('RATE_LIMIT_WINDOW', 3600); // 1 heure

/**
 * Connexion à PostgreSQL avec gestion d'erreurs
 */
function getPDO() {
    try {
        $dsn = 'pgsql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection error', 'message' => 'Could not connect to database']);
        exit();
    }
}

/**
 * Retourner JSON avec statut
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

/**
 * Logger une action
 */
function logAction($type, $action, $user_id_hash = null, $ip = null, $details = null) {
    try {
        $pdo = getPDO();
        $stmt = $pdo->prepare('
            INSERT INTO audit_log (type, action, user_id_hash, ip, details, created_at)
            VALUES (:type, :action, :user_id_hash, :ip, :details, NOW())
        ');
        $stmt->execute([
            ':type' => $type,
            ':action' => $action,
            ':user_id_hash' => $user_id_hash,
            ':ip' => $ip ?? $_SERVER['REMOTE_ADDR'],
            ':details' => is_array($details) ? json_encode($details) : $details,
        ]);
    } catch (Exception $e) {
        error_log('Logging error: ' . $e->getMessage());
    }
}

/**
 * Hash SHA256
 */
function hashData($data) {
    return hash('sha256', $data);
}

/**
 * Obtenir IP client
 */
function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    }
    return $_SERVER['REMOTE_ADDR'];
}

/**
 * Valider JWT
 */
function validateJWT($token) {
    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        if (!$payload || (isset($payload['exp']) && $payload['exp'] < time())) {
            return null;
        }

        $signature = hash_hmac('sha256', $parts[0] . '.' . $parts[1], JWT_SECRET, true);
        $expectedSignature = strtr(rtrim(base64_encode($signature), '='), '+/', '-_');
        
        if (!hash_equals($expectedSignature, $parts[2])) {
            return null;
        }

        return $payload;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Générer JWT
 */
function generateJWT($data) {
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64_encode(json_encode(array_merge($data, ['exp' => time() + JWT_EXPIRY])));
    $signature = hash_hmac('sha256', $header . '.' . $payload, JWT_SECRET, true);
    $signature = strtr(rtrim(base64_encode($signature), '='), '+/', '-_');

    return $header . '.' . $payload . '.' . $signature;
}

/**
 * Valider Bearer Token
 */
function validateBearerToken() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? '';
    
    if (strpos($auth, 'Bearer ') !== 0) {
        return null;
    }

    $token = substr($auth, 7);
    return validateJWT($token);
}

/**
 * Valider API Secret Token (pour communication bot)
 */
function validateAPISecret() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? '';
    
    if (strpos($auth, 'Bearer ') !== 0) {
        return false;
    }

    $token = substr($auth, 7);
    return hash_equals($token, API_SECRET_TOKEN);
}
?>
