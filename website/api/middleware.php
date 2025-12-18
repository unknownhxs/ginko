<?php
/**
 * Middleware de sécurité et validation
 */

require_once __DIR__ . '/config.php';

/**
 * Rate limiting par IP
 */
function checkRateLimit($action = 'general') {
    try {
        $pdo = getPDO();
        $ip = getClientIP();
        $window = time() - RATE_LIMIT_WINDOW;

        $stmt = $pdo->prepare('
            SELECT COUNT(*) as count FROM rate_limit
            WHERE ip = :ip AND action = :action AND timestamp > :window
        ');
        $stmt->execute([
            ':ip' => $ip,
            ':action' => $action,
            ':window' => $window,
        ]);

        $result = $stmt->fetch();
        if ($result['count'] >= RATE_LIMIT_ATTEMPTS) {
            jsonResponse(['error' => 'Too many requests. Try again later.'], 429);
        }

        // Enregistrer tentative
        $stmt = $pdo->prepare('
            INSERT INTO rate_limit (ip, action, timestamp)
            VALUES (:ip, :action, :timestamp)
        ');
        $stmt->execute([
            ':ip' => $ip,
            ':action' => $action,
            ':timestamp' => time(),
        ]);
    } catch (Exception $e) {
        logAction('rate_limit', 'error', null, getClientIP(), $e->getMessage());
    }
}

/**
 * Valider requête POST
 */
function validatePostData($required = []) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!is_array($data)) {
        jsonResponse(['error' => 'Invalid JSON'], 400);
    }

    foreach ($required as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            jsonResponse(['error' => "Missing required field: $field"], 400);
        }
    }

    return $data;
}

/**
 * Valider email
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Valider téléphone (format simple)
 */
function validatePhone($phone) {
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    return strlen($phone) >= 10 && strlen($phone) <= 15;
}

/**
 * Sanitiser entrée
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Générer code OTP
 */
function generateOTP($length = 6) {
    return random_int(pow(10, $length - 1), pow(10, $length) - 1);
}

/**
 * Envoyer email OTP via Mailgun
 */
function sendOTPEmail($email, $otp) {
    if (empty(MAILGUN_API_KEY) || empty(MAILGUN_DOMAIN)) {
        // Mode développement : log simplement
        error_log("OTP for $email: $otp");
        return true;
    }

    try {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.mailgun.net/v3/' . MAILGUN_DOMAIN . '/messages');
        curl_setopt($ch, CURLOPT_USERPWD, 'api:' . MAILGUN_API_KEY);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, [
            'from' => 'RudyProtect <noreply@' . MAILGUN_DOMAIN . '>',
            'to' => $email,
            'subject' => 'Votre code de vérification RudyProtect',
            'html' => "<h2>Code de vérification</h2><p>Votre code est: <strong>$otp</strong></p><p>Il expire dans 10 minutes.</p>",
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        curl_close($ch);

        return $result !== false;
    } catch (Exception $e) {
        error_log('Email error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Appeler API bot
 */
function callBotAPI($endpoint, $method = 'POST', $data = []) {
    try {
        $url = BOT_API_URL . $endpoint;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . API_SECRET_TOKEN,
        ]);
        if ($method !== 'GET') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ['status' => $httpCode, 'data' => json_decode($result, true)];
    } catch (Exception $e) {
        logAction('bot_api', 'error', null, getClientIP(), $e->getMessage());
        return ['status' => 500, 'data' => ['error' => 'Bot API error']];
    }
}

/**
 * Nettoyer anciennes tentatives rate limit
 */
function cleanupOldRateLimits() {
    try {
        $pdo = getPDO();
        $window = time() - RATE_LIMIT_WINDOW;
        $pdo->prepare('DELETE FROM rate_limit WHERE timestamp < :window')->execute([':window' => $window]);
    } catch (Exception $e) {
        error_log('Cleanup error: ' . $e->getMessage());
    }
}

// Nettoyer à chaque requête
cleanupOldRateLimits();
?>
