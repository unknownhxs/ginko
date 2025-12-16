<?php
/**
 * Système CAPTCHA Avancé pour RudyProtect
 * Gestion des sessions CAPTCHA avec stockage et sécurité
 */

class CaptchaManager {
    private $sessionDir;
    private $captchaTimeout;
    private $maxAttempts;
    private $blacklistFile;

    public function __construct($sessionDir = '/tmp/captcha_sessions', $timeout = 300) {
        $this->sessionDir = $sessionDir;
        $this->captchaTimeout = $timeout; // 5 minutes par défaut
        $this->maxAttempts = 5;
        $this->blacklistFile = $sessionDir . '/blacklist.json';
        
        // Créer le répertoire s'il n'existe pas
        if (!is_dir($this->sessionDir)) {
            mkdir($this->sessionDir, 0755, true);
        }
    }

    /**
     * Générer un nouveau CAPTCHA
     */
    public function generate() {
        $code = $this->generateCode();
        $sessionId = $this->createSessionId();
        $challenge = $this->createChallenge($code);
        
        // Stocker la session
        $sessionData = [
            'code' => $code,
            'challenge' => $challenge,
            'created' => time(),
            'attempts' => 0,
            'ip' => $this->getClientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ];
        
        $this->saveSession($sessionId, $sessionData);
        
        return [
            'sessionId' => $sessionId,
            'code' => $code,
            'display' => $this->addVisualNoise($code),
            'challenge' => $challenge
        ];
    }

    /**
     * Vérifier un CAPTCHA
     */
    public function verify($sessionId, $userCode) {
        // Vérifier le IP blacklist
        if ($this->isIpBlacklisted($this->getClientIp())) {
            return [
                'valid' => false,
                'error' => 'Accès refusé',
                'reason' => 'IP blacklistée'
            ];
        }

        $sessionData = $this->loadSession($sessionId);
        
        if (!$sessionData) {
            return [
                'valid' => false,
                'error' => 'Session CAPTCHA invalide ou expirée'
            ];
        }

        // Vérifier l'expiration
        if (time() - $sessionData['created'] > $this->captchaTimeout) {
            $this->deleteSession($sessionId);
            return [
                'valid' => false,
                'error' => 'Session CAPTCHA expirée'
            ];
        }

        // Vérifier le nombre de tentatives
        if ($sessionData['attempts'] >= $this->maxAttempts) {
            $this->blacklistIp($this->getClientIp(), 'Trop de tentatives CAPTCHA');
            $this->deleteSession($sessionId);
            return [
                'valid' => false,
                'error' => 'Trop de tentatives',
                'ip_blocked' => true
            ];
        }

        // Vérifier le code
        $userCodeNormalized = strtoupper(str_replace(' ', '', $userCode));
        $isValid = ($userCodeNormalized === strtoupper($sessionData['code']));
        
        if (!$isValid) {
            $sessionData['attempts']++;
            $this->saveSession($sessionId, $sessionData);
        } else {
            $this->deleteSession($sessionId);
        }

        return [
            'valid' => $isValid,
            'message' => $isValid ? 'Code valide' : 'Code invalide',
            'attempts_left' => $this->maxAttempts - $sessionData['attempts']
        ];
    }

    /**
     * Générer un code CAPTCHA
     */
    private function generateCode() {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $code;
    }

    /**
     * Générer un ID de session unique
     */
    private function createSessionId() {
        return bin2hex(random_bytes(16));
    }

    /**
     * Créer un challenge pour la validation côté client
     */
    private function createChallenge($code) {
        return hash('sha256', $code . time());
    }

    /**
     * Ajouter du bruit visuel au code
     */
    private function addVisualNoise($code) {
        $chars = str_split($code);
        $result = '';
        foreach ($chars as $char) {
            $spaces = random_int(0, 1) ? ' ' : '';
            $result .= $spaces . $char;
        }
        return $result;
    }

    /**
     * Sauvegarder une session
     */
    private function saveSession($sessionId, $data) {
        $filepath = $this->sessionDir . '/' . $sessionId . '.json';
        file_put_contents($filepath, json_encode($data));
        chmod($filepath, 0600);
    }

    /**
     * Charger une session
     */
    private function loadSession($sessionId) {
        $filepath = $this->sessionDir . '/' . $sessionId . '.json';
        
        if (!file_exists($filepath)) {
            return null;
        }
        
        $data = json_decode(file_get_contents($filepath), true);
        return $data;
    }

    /**
     * Supprimer une session
     */
    private function deleteSession($sessionId) {
        $filepath = $this->sessionDir . '/' . $sessionId . '.json';
        if (file_exists($filepath)) {
            unlink($filepath);
        }
    }

    /**
     * Récupérer l'IP du client
     */
    private function getClientIp() {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            return $_SERVER['HTTP_CF_CONNECTING_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Blacklister une IP
     */
    private function blacklistIp($ip, $reason) {
        $blacklist = $this->loadBlacklist();
        
        $blacklist[$ip] = [
            'reason' => $reason,
            'timestamp' => time(),
            'duration' => 3600 // 1 heure
        ];
        
        $this->saveBlacklist($blacklist);
    }

    /**
     * Vérifier si une IP est blacklistée
     */
    private function isIpBlacklisted($ip) {
        $blacklist = $this->loadBlacklist();
        
        if (isset($blacklist[$ip])) {
            $entry = $blacklist[$ip];
            
            // Vérifier l'expiration
            if (time() - $entry['timestamp'] > $entry['duration']) {
                unset($blacklist[$ip]);
                $this->saveBlacklist($blacklist);
                return false;
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Charger la liste des IPs blacklistées
     */
    private function loadBlacklist() {
        if (!file_exists($this->blacklistFile)) {
            return [];
        }
        
        return json_decode(file_get_contents($this->blacklistFile), true) ?? [];
    }

    /**
     * Sauvegarder la liste des IPs blacklistées
     */
    private function saveBlacklist($blacklist) {
        file_put_contents($this->blacklistFile, json_encode($blacklist));
        chmod($this->blacklistFile, 0600);
    }

    /**
     * Nettoyer les sessions expirées
     */
    public function cleanup() {
        $files = glob($this->sessionDir . '/*.json');
        
        foreach ($files as $file) {
            if (basename($file) === 'blacklist.json') continue;
            
            $data = json_decode(file_get_contents($file), true);
            
            if (time() - $data['created'] > $this->captchaTimeout) {
                unlink($file);
            }
        }
    }
}

// Utilisation
if (php_sapi_name() === 'cli') {
    // Mode CLI pour le nettoyage périodique
    $captcha = new CaptchaManager();
    $captcha->cleanup();
    echo "Nettoyage des sessions CAPTCHA effectué\n";
} else {
    // Utilisation en web
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    $captcha = new CaptchaManager();

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    if ($method === 'POST' && $action === 'generate') {
        echo json_encode($captcha->generate());
    } elseif ($method === 'POST' && $action === 'verify') {
        $input = json_decode(file_get_contents('php://input'), true);
        $sessionId = $input['sessionId'] ?? '';
        $code = $input['code'] ?? '';
        
        echo json_encode($captcha->verify($sessionId, $code));
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Action invalide']);
    }
}
?>
