<?php
// Captcha.php - Backend pour la gestion des captchas

header('Content-Type: application/json');

// Configuration
define('SESSION_TIMEOUT', 300); // 5 minutes
define('MAX_ATTEMPTS', 3);

// Classe Captcha Manager
class CaptchaManager {
    private $sessionFile;
    private $captchaData;
    
    public function __construct() {
        $this->sessionFile = sys_get_temp_dir() . '/ginko_captcha_' . session_id() . '.json';
        $this->loadSession();
    }
    
    // ===== Charger la session =====
    private function loadSession() {
        if (file_exists($this->sessionFile)) {
            $data = json_decode(file_get_contents($this->sessionFile), true);
            
            // Vérifier l'expiration
            if (time() - $data['timestamp'] > SESSION_TIMEOUT) {
                unlink($this->sessionFile);
                $this->captchaData = null;
            } else {
                $this->captchaData = $data;
            }
        } else {
            $this->captchaData = null;
        }
    }
    
    // ===== Sauvegarder la session =====
    private function saveSession() {
        file_put_contents($this->sessionFile, json_encode($this->captchaData));
    }
    
    // ===== Générer un captcha mathématique =====
    private function generateMathCaptcha() {
        $num1 = rand(1, 50);
        $num2 = rand(1, 50);
        $operators = ['+', '-', '*'];
        $operator = $operators[array_rand($operators)];
        
        $expression = "$num1 $operator $num2";
        
        switch($operator) {
            case '+':
                $answer = $num1 + $num2;
                break;
            case '-':
                $answer = $num1 - $num2;
                break;
            case '*':
                $answer = $num1 * $num2;
                break;
        }
        
        return [
            'type' => 'math',
            'expression' => $expression,
            'answer' => (string)$answer,
            'display' => "$num1 $operator $num2 = ?"
        ];
    }
    
    // ===== Générer un captcha texte =====
    private function generateTextCaptcha() {
        $words = [
            'GINKO', 'PROTECT', 'SECURITY', 'DISCORD', 'VERIFY',
            'SHIELD', 'DRAGON', 'PHOENIX', 'FALCON', 'TIGER'
        ];
        
        $word = $words[array_rand($words)];
        $scrambled = $this->scrambleString($word);
        
        return [
            'type' => 'text',
            'word' => $word,
            'scrambled' => $scrambled,
            'display' => "Rearrangez les lettres: $scrambled"
        ];
    }
    
    // ===== Mélanger une chaîne =====
    private function scrambleString($str) {
        $arr = str_split($str);
        shuffle($arr);
        return implode('', $arr);
    }
    
    // ===== Créer un nouveau captcha =====
    public function createCaptcha() {
        $type = rand(0, 1) ? 'math' : 'text';
        
        if ($type === 'math') {
            $captcha = $this->generateMathCaptcha();
        } else {
            $captcha = $this->generateTextCaptcha();
        }
        
        $this->captchaData = [
            'type' => $captcha['type'],
            'answer' => $captcha['answer'],
            'timestamp' => time(),
            'attempts' => 0
        ];
        
        $this->saveSession();
        
        return [
            'success' => true,
            'captcha' => $captcha
        ];
    }
    
    // ===== Vérifier la réponse =====
    public function verifyCaptcha($userAnswer) {
        if (!$this->captchaData) {
            return [
                'success' => false,
                'error' => 'Aucun captcha en cours. Veuillez générer un nouveau.'
            ];
        }
        
        // Vérifier l'expiration
        if (time() - $this->captchaData['timestamp'] > SESSION_TIMEOUT) {
            unlink($this->sessionFile);
            return [
                'success' => false,
                'error' => 'Le captcha a expiré. Veuillez réessayer.'
            ];
        }
        
        // Vérifier les tentatives
        $this->captchaData['attempts']++;
        
        if ($this->captchaData['attempts'] > MAX_ATTEMPTS) {
            return [
                'success' => false,
                'error' => 'Trop de tentatives échouées. Accès refusé.',
                'blocked' => true
            ];
        }
        
        // Vérifier la réponse
        $userAnswer = strtoupper(trim($userAnswer));
        $correctAnswer = strtoupper(trim($this->captchaData['answer']));
        
        if ($userAnswer === $correctAnswer) {
            // Succès - Marquer la vérification
            $_SESSION['captcha_verified'] = true;
            $_SESSION['verification_time'] = time();
            
            if (file_exists($this->sessionFile)) {
                unlink($this->sessionFile);
            }
            
            return [
                'success' => true,
                'message' => 'Vérification réussie!',
                'verified' => true
            ];
        } else {
            $this->saveSession();
            
            $attemptsRemaining = MAX_ATTEMPTS - $this->captchaData['attempts'];
            
            return [
                'success' => false,
                'error' => "Réponse incorrecte. $attemptsRemaining tentative(s) restante(s).",
                'attempts_remaining' => $attemptsRemaining
            ];
        }
    }
    
    // ===== Vérifier si l'utilisateur est vérifié =====
    public function isVerified() {
        return isset($_SESSION['captcha_verified']) && $_SESSION['captcha_verified'] === true;
    }
    
    // ===== Nettoyer les anciennes sessions =====
    public function cleanupOldSessions() {
        $tmpDir = sys_get_temp_dir();
        $files = glob($tmpDir . '/ginko_captcha_*.json');
        
        foreach ($files as $file) {
            if (time() - filemtime($file) > SESSION_TIMEOUT * 2) {
                @unlink($file);
            }
        }
    }
}

// ===== ROUTE HANDLER =====
session_start();

$captcha = new CaptchaManager();

// Nettoyer les anciennes sessions
$captcha->cleanupOldSessions();

// Déterminer l'action
$action = $_GET['action'] ?? $_POST['action'] ?? null;

switch ($action) {
    case 'create':
        echo json_encode($captcha->createCaptcha());
        break;
    
    case 'verify':
        $answer = $_POST['answer'] ?? '';
        echo json_encode($captcha->verifyCaptcha($answer));
        break;
    
    case 'check':
        echo json_encode([
            'verified' => $captcha->isVerified()
        ]);
        break;
    
    default:
        echo json_encode([
            'success' => false,
            'error' => 'Action non reconnue'
        ]);
}
?>
