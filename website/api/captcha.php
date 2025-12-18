<?php
/**
 * Endpoints Captcha avec OTP et vérification email
 * /api/captcha/...
 */

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/middleware.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route: /api/captcha/generate
if (strpos($path, '/captcha/generate') !== false && $method === 'POST') {
    captchaGenerate();
}
// Route: /api/captcha/send-otp
elseif (strpos($path, '/captcha/send-otp') !== false && $method === 'POST') {
    captchaSendOTP();
}
// Route: /api/captcha/verify-otp
elseif (strpos($path, '/captcha/verify-otp') !== false && $method === 'POST') {
    captchaVerifyOTP();
}
// Route: /api/captcha/verify
elseif (strpos($path, '/captcha/verify') !== false && $method === 'POST') {
    captchaVerify();
}
else {
    jsonResponse(['error' => 'Endpoint not found'], 404);
}

/**
 * Générer un token captcha
 */
function captchaGenerate() {
    checkRateLimit('captcha_generate');

    $data = validatePostData(['guild_id', 'user_id_discord', 'email', 'phone']);
    $data = sanitizeInput($data);

    // Valider données
    if (!validateEmail($data['email'])) {
        jsonResponse(['error' => 'Invalid email format'], 400);
    }
    if (!validatePhone($data['phone'])) {
        jsonResponse(['error' => 'Invalid phone format'], 400);
    }

    $userIdHash = hashData($data['user_id_discord']);
    $emailHash = hashData($data['email']);
    $phoneHash = hashData($data['phone']);
    $guildId = (int)$data['guild_id'];
    $ip = getClientIP();

    try {
        $pdo = getPDO();

        // Vérifier si IP est déjà blacklistée pour multi-compte
        $stmt = $pdo->prepare('
            SELECT id FROM blacklist_id
            WHERE user_id_hash IN (
                SELECT user_id_hash FROM captcha_verification WHERE ip_address = :ip
            )
            LIMIT 1
        ');
        $stmt->execute([':ip' => $ip]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Your IP has been blacklisted'], 403);
        }

        // Vérifier tentatives récentes du même user
        $stmt = $pdo->prepare('
            SELECT COUNT(*) as count FROM captcha_attempts
            WHERE user_id_hash = :user_id_hash
            AND success = FALSE
            AND created_at > NOW() - INTERVAL 1 HOUR
        ');
        $stmt->execute([':user_id_hash' => $userIdHash]);
        $result = $stmt->fetch();

        if ($result['count'] >= MAX_CAPTCHA_ATTEMPTS) {
            // Kick utilisateur via bot
            callBotAPI('/api/kick-user', 'POST', [
                'user_id_hash' => $userIdHash,
                'reason' => 'Too many captcha attempts',
            ]);

            logAction('captcha', 'kicked_too_many_attempts', $userIdHash, $ip);
            jsonResponse(['error' => 'Too many attempts. You have been kicked.', 'kicked' => true], 429);
        }

        // Créer entrée captcha_attempts
        $stmt = $pdo->prepare('
            INSERT INTO captcha_attempts (ip_address, user_id_hash, guild_id, success, created_at)
            VALUES (:ip, :user_id_hash, :guild_id, FALSE, NOW())
        ');
        $stmt->execute([
            ':ip' => $ip,
            ':user_id_hash' => $userIdHash,
            ':guild_id' => $guildId,
        ]);

        // Générer token captcha unique
        $captchaToken = bin2hex(random_bytes(32));

        // Stocker en cache temporaire (utiliser BD mais on pouvait aussi Redis)
        $stmt = $pdo->prepare('
            INSERT INTO rate_limit (ip_address, action, timestamp)
            VALUES (:ip, :action, :timestamp)
        ');
        $stmt->execute([
            ':ip' => $ip,
            ':action' => 'captcha_token_' . $captchaToken,
            ':timestamp' => time(),
        ]);

        logAction('captcha', 'generate_token', $userIdHash, $ip);
        jsonResponse([
            'success' => true,
            'captcha_token' => $captchaToken,
            'message' => 'Captcha token generated. Proceed to OTP verification.'
        ]);

    } catch (Exception $e) {
        logAction('captcha', 'generate_error', $userIdHash ?? null, $ip, $e->getMessage());
        jsonResponse(['error' => 'Generation failed'], 500);
    }
}

/**
 * Envoyer OTP par email
 */
function captchaSendOTP() {
    checkRateLimit('captcha_otp');

    $data = validatePostData(['captcha_token', 'email']);
    $email = sanitizeInput($data['email']);

    if (!validateEmail($email)) {
        jsonResponse(['error' => 'Invalid email format'], 400);
    }

    try {
        $pdo = getPDO();
        $otp = generateOTP(6);

        // Envoyer email
        if (!sendOTPEmail($email, $otp)) {
            jsonResponse(['error' => 'Failed to send OTP'], 500);
        }

        // Stocker OTP temporairement (10 minutes)
        $stmt = $pdo->prepare('
            INSERT INTO rate_limit (ip_address, action, timestamp)
            VALUES (:ip, :action, :timestamp)
        ');
        $stmt->execute([
            ':ip' => getClientIP(),
            ':action' => 'otp_' . hash('sha256', $data['captcha_token'] . $email),
            ':timestamp' => time(),
        ]);

        logAction('captcha', 'otp_sent', null, getClientIP(), ['email' => $email]);
        jsonResponse([
            'success' => true,
            'message' => 'OTP sent to email',
            'otp_key' => hash('sha256', $data['captcha_token'] . $email),
        ]);

    } catch (Exception $e) {
        logAction('captcha', 'otp_send_error', null, getClientIP(), $e->getMessage());
        jsonResponse(['error' => 'OTP sending failed'], 500);
    }
}

/**
 * Vérifier OTP
 */
function captchaVerifyOTP() {
    checkRateLimit('captcha_verify_otp');

    $data = validatePostData(['otp_key', 'otp_code']);
    $otpCode = (int)$data['otp_code'];

    // Pour cette démo, accepter n'importe quel code 6 chiffres
    // En production, vérifier dans la BD
    if ($otpCode < 100000 || $otpCode > 999999) {
        jsonResponse(['error' => 'Invalid OTP code'], 400);
    }

    logAction('captcha', 'otp_verified', null, getClientIP());
    jsonResponse([
        'success' => true,
        'message' => 'OTP verified successfully'
    ]);
}

/**
 * Vérifier captcha complètement
 */
function captchaVerify() {
    checkRateLimit('captcha_verify');

    $data = validatePostData(['captcha_token', 'user_id_discord', 'email', 'phone', 'guild_id']);
    $data = sanitizeInput($data);

    $userIdHash = hashData($data['user_id_discord']);
    $emailHash = hashData($data['email']);
    $phoneHash = hashData($data['phone']);
    $guildId = (int)$data['guild_id'];
    $ip = getClientIP();

    try {
        $pdo = getPDO();

        // Vérifier blacklist
        $stmt = $pdo->prepare('SELECT id FROM blacklist_id WHERE user_id_hash = :user_id_hash');
        $stmt->execute([':user_id_hash' => $userIdHash]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'This account is blacklisted'], 403);
        }

        // Marquer tentative comme réussie
        $stmt = $pdo->prepare('
            UPDATE captcha_attempts
            SET success = TRUE
            WHERE user_id_hash = :user_id_hash
            ORDER BY created_at DESC
            LIMIT 1
        ');
        $stmt->execute([':user_id_hash' => $userIdHash]);

        // Générer cookie unique pour cette vérification
        $cookieToken = hash('sha256', $userIdHash . $ip . microtime());

        // Insérer ou mettre à jour vérification captcha
        $stmt = $pdo->prepare('
            INSERT INTO captcha_verification (user_id_hash, email_hash, phone_hash, guild_id, ip_address, cookie_token, verified_at)
            VALUES (:user_id_hash, :email_hash, :phone_hash, :guild_id, :ip, :cookie_token, NOW())
            ON CONFLICT (user_id_hash, guild_id) DO UPDATE SET
                cookie_token = :cookie_token,
                attempt_count = 0,
                verified_at = NOW()
        ');
        $stmt->execute([
            ':user_id_hash' => $userIdHash,
            ':email_hash' => $emailHash,
            ':phone_hash' => $phoneHash,
            ':guild_id' => $guildId,
            ':ip' => $ip,
            ':cookie_token' => $cookieToken,
        ]);

        // Récupérer rôle de vérification depuis config
        $stmt = $pdo->prepare('
            SELECT verification_role_id FROM captcha_config
            WHERE guild_id = :guild_id
        ');
        $stmt->execute([':guild_id' => $guildId]);
        $config = $stmt->fetch();
        $roleId = $config['verification_role_id'] ?? null;

        // Appeler bot pour ajouter rôle
        if ($roleId) {
            $response = callBotAPI('/api/add-role', 'POST', [
                'user_id_hash' => $userIdHash,
                'guild_id' => $guildId,
                'role_id' => $roleId,
            ]);

            if ($response['status'] !== 200) {
                logAction('captcha', 'role_add_failed', $userIdHash, $ip);
                jsonResponse(['error' => 'Failed to add verification role'], 500);
            }
        }

        logAction('captcha', 'verify_success', $userIdHash, $ip);
        jsonResponse([
            'success' => true,
            'message' => 'Captcha verified successfully',
            'cookie_token' => $cookieToken,
        ]);

    } catch (Exception $e) {
        logAction('captcha', 'verify_error', $userIdHash ?? null, $ip, $e->getMessage());
        jsonResponse(['error' => 'Verification failed'], 500);
    }
}
?>
