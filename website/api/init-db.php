<?php
/**
 * Initialisation des tables PostgreSQL
 * À exécuter une fois : http://localhost:8080/api/init-db.php
 */

require_once __DIR__ . '/config.php';

try {
    $pdo = getPDO();

    // Table captcha_verification
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS captcha_verification (
            id SERIAL PRIMARY KEY,
            user_id_hash VARCHAR(64) NOT NULL,
            email_hash VARCHAR(64) NOT NULL,
            phone_hash VARCHAR(64),
            guild_id BIGINT NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            cookie_token VARCHAR(64) UNIQUE NOT NULL,
            attempt_count INT DEFAULT 0,
            verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id_hash, guild_id)
        );
        CREATE INDEX IF NOT EXISTS idx_captcha_user_hash ON captcha_verification(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_captcha_ip ON captcha_verification(ip_address);
    ');

    // Table captcha_attempts
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS captcha_attempts (
            id SERIAL PRIMARY KEY,
            ip_address VARCHAR(45) NOT NULL,
            user_id_hash VARCHAR(64),
            guild_id BIGINT,
            attempt_number INT DEFAULT 1,
            success BOOLEAN DEFAULT FALSE,
            otp_code INT,
            otp_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 10 MINUTE)
        );
        CREATE INDEX IF NOT EXISTS idx_attempts_ip ON captcha_attempts(ip_address);
        CREATE INDEX IF NOT EXISTS idx_attempts_user_hash ON captcha_attempts(user_id_hash);
    ');

    // Table account_verification
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS account_verification (
            id SERIAL PRIMARY KEY,
            user_id_hash VARCHAR(64) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            email_hash VARCHAR(64),
            phone_hash VARCHAR(64),
            verified BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_account_user_hash ON account_verification(user_id_hash);
    ');

    // Table website_actions
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS website_actions (
            id SERIAL PRIMARY KEY,
            user_id_hash VARCHAR(64),
            ip_address VARCHAR(45),
            action VARCHAR(100) NOT NULL,
            status VARCHAR(50) DEFAULT "success",
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_website_action ON website_actions(action);
        CREATE INDEX IF NOT EXISTS idx_website_user ON website_actions(user_id_hash);
    ');

    // Table bot_actions
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS bot_actions (
            id SERIAL PRIMARY KEY,
            user_id_hash VARCHAR(64) NOT NULL,
            guild_id BIGINT NOT NULL,
            action VARCHAR(100) NOT NULL,
            target_user_id_hash VARCHAR(64),
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bot_action ON bot_actions(action);
        CREATE INDEX IF NOT EXISTS idx_bot_user ON bot_actions(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_bot_guild ON bot_actions(guild_id);
    ');

    // Table audit_log
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS audit_log (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            action VARCHAR(100) NOT NULL,
            user_id_hash VARCHAR(64),
            ip_address VARCHAR(45),
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log(type);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    ');

    // Table blacklist_id (utilisateurs bannis pour multi-compte)
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS blacklist_id (
            id SERIAL PRIMARY KEY,
            user_id_hash VARCHAR(64) NOT NULL UNIQUE,
            guild_id BIGINT,
            reason VARCHAR(255) DEFAULT "multi-account attempt",
            is_permanent BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_blacklist_user_hash ON blacklist_id(user_id_hash);
    ');

    // Table guild_admins
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS guild_admins (
            id SERIAL PRIMARY KEY,
            user_id_hash VARCHAR(64) NOT NULL,
            guild_id BIGINT NOT NULL,
            can_edit_config BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id_hash, guild_id)
        );
        CREATE INDEX IF NOT EXISTS idx_guild_admin_user ON guild_admins(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_guild_admin_guild ON guild_admins(guild_id);
    ');

    // Table rate_limit
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS rate_limit (
            id SERIAL PRIMARY KEY,
            ip_address VARCHAR(45) NOT NULL,
            action VARCHAR(100) NOT NULL,
            timestamp INT NOT NULL,
            INDEX idx_rate_limit_ip (ip_address, timestamp)
        );
    ');

    // Ajouter colonne verification_role_id à captcha_config si elle existe
    try {
        $pdo->exec('
            ALTER TABLE captcha_config
            ADD COLUMN verification_role_id BIGINT
        ');
    } catch (Exception $e) {
        // Colonne existe déjà ou table n'existe pas
    }

    echo json_encode([
        'success' => true,
        'message' => 'All tables created successfully'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
