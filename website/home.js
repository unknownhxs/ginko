// ===== ANIMATIONS ET EFFETS INTERACTIFS =====

// Observer pour l'animation à l'apparition
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observer tous les éléments animables
document.querySelectorAll('.feature-card, .stat-box, .about-content').forEach(el => {
    observer.observe(el);
});

// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.background = 'rgba(15, 15, 30, 0.95)';
        navbar.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.2)';
    } else {
        navbar.style.background = 'rgba(15, 15, 30, 0.8)';
        navbar.style.boxShadow = 'var(--shadow-md)';
    }
    
    lastScroll = currentScroll;
});

// ===== SMOOTH SCROLL POUR ANCRES =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '#home') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// ===== EFFETS SOURIS SUR LES CARTES =====
document.querySelectorAll('.feature-card, .stat-box').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// ===== ANIMATION DE COMPTEURS =====
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 50);
    let current = start;

    const counter = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = formatNumber(target);
            clearInterval(counter);
        } else {
            element.textContent = formatNumber(Math.floor(current));
        }
    }, 50);
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'K+';
    }
    return num.toString() + '%';
}

// Observer pour les compteurs
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statBox = entry.target;
            const number = statBox.querySelector('.stat-number');
            const text = number.textContent;
            const target = parseInt(text.replace(/[^0-9]/g, ''));
            
            animateCounter(number, target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-box').forEach(box => {
    counterObserver.observe(box);
});

// ===== EFFET GLOW SUR LES BOUTONS =====
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const span = document.createElement('span');
        span.style.left = x + 'px';
        span.style.top = y + 'px';
        span.style.position = 'absolute';
        span.style.width = '100px';
        span.style.height = '100px';
        span.style.background = 'rgba(255, 255, 255, 0.5)';
        span.style.borderRadius = '50%';
        span.style.pointerEvents = 'none';
        span.style.animation = 'ripple 0.6s ease-out forwards';
        
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(span);
        
        setTimeout(() => span.remove(), 600);
    });
});

// ===== PARALLAX EFFECT =====
window.addEventListener('scroll', () => {
    const hero = document.querySelector('.hero');
    if (hero) {
        const scrolled = window.pageYOffset;
        const orbs = hero.querySelectorAll('.orb');
        orbs.forEach((orb, index) => {
            orb.style.transform = `translateY(${scrolled * (0.5 + index * 0.1)}px)`;
        });
    }
});

// ===== CURSOR EFFECT =====
document.addEventListener('mousemove', (e) => {
    const cursor = document.getElementById('cursor');
    if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});

// ===== ANIMATION À L'APPARITION =====
const fadeInUp = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;

const style = document.createElement('style');
style.textContent = fadeInUp;
document.head.appendChild(style);

// ===== CHARGEMENT DE LA PAGE =====
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// ===== DÉTECTION DE MOUVEMENT SOURIS POUR EFFETS =====
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Appliquer l'effet aux orbes
    const orbs = document.querySelectorAll('.orb');
    orbs.forEach((orb, index) => {
        const moveX = (mouseX / window.innerWidth) * (index + 1) * 2;
        const moveY = (mouseY / window.innerHeight) * (index + 1) * 2;
        orb.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
});

// ===== GESTION DU FOCUS =====
document.querySelectorAll('input, textarea, select').forEach(element => {
    element.addEventListener('focus', function() {
        this.style.outline = 'none';
        this.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.5)';
    });
    
    element.addEventListener('blur', function() {
        this.style.boxShadow = 'none';
    });
});

console.log('✨ Ginko - Dashboard de protection Discord chargé!');
