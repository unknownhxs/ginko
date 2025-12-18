/**
 * RudyProtect - Application JavaScript
 * Gestion de l'authentification, captcha, et dashboard
 */

const API_URL = 'http://localhost:8080/api';
let authToken = localStorage.getItem('rudyprotect_token');
let currentUser = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkAuthentication();
    loadStats();
});

function setupEventListeners() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const getCaptchaBtn = document.getElementById('getCaptchaBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', startDiscordLogin);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    if (getCaptchaBtn) {
        getCaptchaBtn.addEventListener('click', openCaptchaModal);
    }
}

// ===== AUTHENTICATION =====
async function checkAuthentication() {
    if (!authToken) {
        showHeroSection();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showDashboard();
            displayUserInfo();
            displayAdminServers();
        } else {
            authToken = null;
            localStorage.removeItem('rudyprotect_token');
            showHeroSection();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showHeroSection();
    }
}

async function startDiscordLogin() {
    try {
        const response = await fetch(`${API_URL}/auth/discord/authorize`);
        const data = await response.json();
        window.location.href = data.url;
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

async function handleDiscordCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/discord/callback?code=${code}`);
        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('rudyprotect_token', authToken);
            currentUser = data.user;
            
            window.history.replaceState({}, document.title, window.location.pathname);
            showDashboard();
            displayUserInfo();
            displayAdminServers();
        } else {
            showAlert(data.error || 'Erreur d\'authentification', 'danger');
        }
    } catch (error) {
        console.error('Callback error:', error);
        showAlert('Erreur lors du traitement du callback', 'danger');
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('rudyprotect_token');
    currentUser = null;
    showHeroSection();
}

// ===== UI SECTIONS =====
function showHeroSection() {
    document.getElementById('heroSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'inline-block';
    document.getElementById('userMenu').style.display = 'none';
}

function showDashboard() {
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
}

function displayUserInfo() {
    if (!currentUser) return;

    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) {
        nameEl.textContent = currentUser.username;
    }
    if (avatarEl && currentUser.avatar) {
        avatarEl.src = `https://cdn.discordapp.com/avatars/${currentUser.avatar}`;
    }
}

function displayAdminServers() {
    if (!currentUser || !currentUser.admin_guilds) return;

    const container = document.getElementById('adminServersList');
    container.innerHTML = '';

    currentUser.admin_guilds.forEach(guild => {
        const serverItem = document.createElement('div');
        serverItem.className = 'server-item';
        serverItem.innerHTML = `
            <div class="server-icon" style="background-image: url('https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png')"></div>
            <div class="server-name">${guild.name}</div>
            <div class="server-status">✓ Admin</div>
            <button class="btn btn-sm btn-primary" style="width: 100%; margin-top: 10px;">Configurer</button>
        `;
        container.appendChild(serverItem);
    });
}

// ===== STATS =====
async function loadStats() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_URL}/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('Stats error:', error);
    }
}

function updateStatsDisplay(stats) {
    document.getElementById('statVerifications').textContent = stats.total_captchas_verified || 0;
    document.getElementById('statAdminServers').textContent = stats.admin_servers || 0;
    document.getElementById('statReports').textContent = stats.total_reports || 0;
    document.getElementById('statBlacklisted').textContent = stats.total_blacklisted || 0;
}

// ===== CAPTCHA MODAL =====
function openCaptchaModal() {
    document.getElementById('captchaModal').style.display = 'flex';
    resetCaptchaForm();
}

function closeCaptchaModal() {
    document.getElementById('captchaModal').style.display = 'none';
}

function resetCaptchaForm() {
    document.getElementById('captchaStep1').classList.add('active');
    document.getElementById('captchaStep2').classList.remove('active');
    document.getElementById('captchaStep3').classList.remove('active');
    document.getElementById('captchaForm1').reset();
}

async function sendOTP() {
    const email = document.getElementById('captchaEmail').value;
    const phone = document.getElementById('captchaPhone').value;

    if (!email || !phone) {
        showAlert('Veuillez remplir tous les champs', 'danger');
        return;
    }

    try {
        // Générer token captcha d'abord
        const generateResponse = await fetch(`${API_URL}/captcha/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guild_id: currentUser?.admin_guilds[0]?.id || '123456789',
                user_id_discord: currentUser?.username || 'anonymous',
                email,
                phone
            })
        });

        if (!generateResponse.ok) {
            const error = await generateResponse.json();
            showAlert(error.error || 'Erreur de génération', 'danger');
            return;
        }

        const generateData = await generateResponse.json();
        window.captchaToken = generateData.captcha_token;

        // Envoyer OTP
        const otpResponse = await fetch(`${API_URL}/captcha/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                captcha_token: window.captchaToken,
                email
            })
        });

        if (otpResponse.ok) {
            window.otpKey = (await otpResponse.json()).otp_key;
            showCaptchaStep(2);
            showAlert('Code OTP envoyé à votre email', 'success');
        } else {
            showAlert('Erreur d\'envoi OTP', 'danger');
        }
    } catch (error) {
        console.error('OTP error:', error);
        showAlert('Erreur lors de l\'envoi de l\'OTP', 'danger');
    }
}

async function verifyOTP() {
    const otpCode = document.getElementById('captchaOTP').value;

    if (!otpCode || otpCode.length !== 6) {
        showAlert('Veuillez entrer un code OTP valide', 'danger');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/captcha/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                otp_key: window.otpKey,
                otp_code: parseInt(otpCode)
            })
        });

        if (response.ok) {
            // Vérifier captcha complètement
            const verifyResponse = await fetch(`${API_URL}/captcha/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    captcha_token: window.captchaToken,
                    user_id_discord: currentUser?.username || 'anonymous',
                    email: document.getElementById('captchaEmail').value,
                    phone: document.getElementById('captchaPhone').value,
                    guild_id: currentUser?.admin_guilds[0]?.id || '123456789'
                })
            });

            if (verifyResponse.ok) {
                showCaptchaStep(3);
                showAlert('Vérification réussie!', 'success');
            } else {
                showAlert('Erreur de vérification', 'danger');
            }
        } else {
            showAlert('Code OTP invalide', 'danger');
        }
    } catch (error) {
        console.error('Verify error:', error);
        showAlert('Erreur lors de la vérification', 'danger');
    }
}

function showCaptchaStep(step) {
    document.getElementById('captchaStep1').classList.remove('active');
    document.getElementById('captchaStep2').classList.remove('active');
    document.getElementById('captchaStep3').classList.remove('active');
    document.getElementById(`captchaStep${step}`).classList.add('active');
}

// ===== ALERTS =====
function showAlert(message, type = 'info') {
    // Implémentation simple - à améliorer avec une vraie notification
    console.log(`[${type}] ${message}`);
}

// ===== CLOSE MODAL ON OUTSIDE CLICK =====
window.addEventListener('click', function(event) {
    const modal = document.getElementById('captchaModal');
    if (event.target === modal) {
        closeCaptchaModal();
    }
});

// ===== CHECK FOR DISCORD CALLBACK =====
if (window.location.search.includes('code=')) {
    handleDiscordCallback();
}
