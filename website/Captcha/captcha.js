// Captcha Types
const CAPTCHA_TYPES = {
    MATH: 'math',
    TEXT: 'text'
};

// Current Captcha State
let currentCaptcha = null;
let attemptsRemaining = 3;

document.addEventListener('DOMContentLoaded', function() {
    initializeCaptcha();
    setupEventListeners();
});

// ===== INITIALIZE CAPTCHA =====
function initializeCaptcha() {
    setTimeout(() => {
        generateNewCaptcha();
        transitionState('loading', 'captcha');
    }, 1500);
}

// ===== GENERATE CAPTCHA =====
function generateNewCaptcha() {
    const captchaType = Math.random() > 0.5 ? CAPTCHA_TYPES.MATH : CAPTCHA_TYPES.TEXT;
    
    if (captchaType === CAPTCHA_TYPES.MATH) {
        currentCaptcha = generateMathCaptcha();
    } else {
        currentCaptcha = generateTextCaptcha();
    }
    
    displayCaptcha();
    clearInput();
    clearError();
}

// ===== MATH CAPTCHA =====
function generateMathCaptcha() {
    const num1 = Math.floor(Math.random() * 50) + 1;
    const num2 = Math.floor(Math.random() * 50) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer;
    let expression = `${num1} ${operator} ${num2}`;
    
    switch(operator) {
        case '+':
            answer = num1 + num2;
            break;
        case '-':
            answer = num1 - num2;
            break;
        case '*':
            answer = num1 * num2;
            break;
    }
    
    return {
        type: CAPTCHA_TYPES.MATH,
        expression: expression,
        answer: answer.toString(),
        display: `${num1} ${operator} ${num2} = ?`
    };
}

// ===== TEXT CAPTCHA =====
function generateTextCaptcha() {
    const words = [
        'GINKO', 'PROTECT', 'SECURITY', 'DISCORD', 'VERIFY',
        'SHIELD', 'DRAGON', 'PHOENIX', 'FALCON', 'TIGER'
    ];
    
    const word = words[Math.floor(Math.random() * words.length)];
    const scrambled = scrambleString(word);
    
    return {
        type: CAPTCHA_TYPES.TEXT,
        word: word,
        scrambled: scrambled,
        display: `Rearrangez les lettres: ${scrambled}`
    };
}

// ===== SCRAMBLE STRING =====
function scrambleString(str) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

// ===== DISPLAY CAPTCHA =====
function displayCaptcha() {
    const challengeDiv = document.getElementById('captchaChallenge');
    
    if (currentCaptcha.type === CAPTCHA_TYPES.MATH) {
        challengeDiv.innerHTML = `<div class="challenge-math">${currentCaptcha.display}</div>`;
    } else {
        challengeDiv.innerHTML = `<div class="challenge-text">${currentCaptcha.display}</div>`;
    }
}

// ===== VERIFY CAPTCHA =====
function verifyCaptcha() {
    const userAnswer = document.getElementById('captchaAnswer').value.trim();
    
    if (!userAnswer) {
        showError('Veuillez entrer une réponse');
        return;
    }
    
    const isCorrect = userAnswer.toUpperCase() === currentCaptcha.answer.toUpperCase();
    
    if (isCorrect) {
        successCaptcha();
    } else {
        attemptsRemaining--;
        
        if (attemptsRemaining > 0) {
            showError(`Réponse incorrecte. ${attemptsRemaining} tentative(s) restante(s)`);
            clearInput();
            generateNewCaptcha();
        } else {
            failureCaptcha('Trop de tentatives échouées. Accès refusé.');
        }
    }
}

// ===== SUCCESS =====
function successCaptcha() {
    console.log('✅ Captcha vérifié avec succès!');
    transitionState('captcha', 'success');
    
    // Store verification token
    sessionStorage.setItem('captcha_verified', 'true');
    sessionStorage.setItem('verification_time', new Date().toISOString());
}

// ===== FAILURE =====
function failureCaptcha(message) {
    document.getElementById('failureMessage').textContent = message;
    transitionState('captcha', 'failure');
    
    // Clear verification after 5 seconds
    setTimeout(() => {
        location.reload();
    }, 5000);
}

// ===== TRANSITION STATE =====
function transitionState(fromState, toState) {
    const fromElement = document.getElementById(fromState + 'State');
    const toElement = document.getElementById(toState + 'State');
    
    if (fromElement) {
        fromElement.classList.remove('active');
    }
    
    setTimeout(() => {
        if (toElement) {
            toElement.style.display = toElement.style.display === 'none' ? 'block' : toElement.style.display;
            toElement.classList.add('active');
        }
    }, 300);
}

// ===== SHOW ERROR =====
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
    errorDiv.style.display = 'block';
}

// ===== CLEAR ERROR =====
function clearError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.remove('active');
    errorDiv.style.display = 'none';
}

// ===== CLEAR INPUT =====
function clearInput() {
    document.getElementById('captchaAnswer').value = '';
    document.getElementById('captchaAnswer').focus();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Verify button
    document.getElementById('verifyBtn').addEventListener('click', verifyCaptcha);
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        generateNewCaptcha();
        clearError();
    });
    
    // Continue button
    document.getElementById('continueBtn').addEventListener('click', () => {
        // Redirect or close
        window.location.href = '/website/dashboard/';
    });
    
    // Retry button
    document.getElementById('retryBtn').addEventListener('click', () => {
        location.reload();
    });
    
    // Enter key to verify
    document.getElementById('captchaAnswer').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyCaptcha();
        }
    });
}
