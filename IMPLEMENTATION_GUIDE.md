# RudyProtect - Refonte Complète

## 📋 Architecture

RudyProtect a été complètement refactorisé avec une architecture découplée :

### Serveur 1 : Discord Bot (Node.js)
- Port : 5008 (API REST)
- Responsabilités :
  - Gestion des événements Discord (captcha, modération)
  - Commandes slash
  - Endpoints REST pour communication inter-serveurs

### Serveur 2 : Website (PHP/PostgreSQL)
- Port : 8080 (Apache/Nginx)
- Responsabilités :
  - Interface web
  - Authentification Discord OAuth2
  - Captcha avec OTP
  - Dashboard admin

### Base de Données : PostgreSQL (Partagée)
- Connexion : CockroachDB (cloud)
- Tables : `captcha_verification`, `website_actions`, `bot_actions`, `audit_log`, `blacklist_id`, `guild_admins`, etc.

---

## 🚀 Installation et Démarrage

### 1. Configuration du .env

Modifier `.env` avec vos vraies valeurs :

```env
# Discord
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URI=http://localhost:8080/api/auth/discord/callback

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=rudyprotect
DB_USER=your-user
DB_PASS=your-password

# Security
JWT_SECRET=your-jwt-secret-key-change-in-production
API_SECRET_TOKEN=your-api-token-for-bot-communication

# Email (Mailgun)
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-domain.mg.mailgun.org

# Bot API
BOT_API_URL=http://us-tx-dal.hostbu.com:5008
BOT_API_PORT=5008
```

### 2. Démarrer le Bot Discord

```bash
cd h:\RudyProtect
node index.js
```

Le bot va :
- Initialiser la base de données
- Charger les commandes slash
- Écouter les événements
- Lancer l'API REST sur le port 5008

### 3. Démarrer le Website (PHP)

```bash
cd h:\RudyProtect\website
php -S localhost:8080
```

Puis :
1. Accéder à `http://localhost:8080`
2. Initialiser la BD : `http://localhost:8080/api/init-db`
3. Tester OAuth2 Discord

---

## 📁 Structure des Fichiers

### Bot Discord
```
index.js                    # Point d'entrée principal
config/
  config.js               # Configuration + Pool PostgreSQL
src/
  cmds/slash/             # Commandes slash Discord
  events/                 # Événements Discord
  handlers/               # Handlers (déploiement commandes)
  services/
    botAPI.js             # 🆕 API REST pour bot (port 5008)
    blacklistIdService.js
    reportErrorService.js
```

### Website
```
website/
  api/
    config.php            # 🆕 Configuration & connexion BD
    middleware.php        # 🆕 Middleware sécurité
    index.php             # 🆕 Routeur API
    init-db.php           # 🆕 Initialisation tables
    auth.php              # 🆕 OAuth2 Discord
    captcha.php           # 🆕 Captcha + OTP
    blacklist.php         # 🆕 Gestion blacklist
    reports.php           # 🆕 Signalements
    stats.php             # 🆕 Statistiques
  index.html              # 🔄 Refait (noir/violet néon)
  styles-app.css          # 🆕 Design noir/violet néon
  app.js                  # 🆕 Logic JavaScript
```

---

## 🔐 Sécurité Implémentée

✅ **JWT** : Tokens 1h avec expiration
✅ **Bearer Token** : Pour API bot ↔ site
✅ **SHA256** : Hachage user_id, email, phone
✅ **Rate Limiting** : 20 tentatives/heure par IP
✅ **Prepared Statements** : PDO pour SQL Injection
✅ **CORS** : Contrôle d'accès des origines
✅ **Password Hashing** : (if used)
✅ **OTP Expiry** : 10 minutes
✅ **Anti Multi-Account** : Détection IP + cookie permanent

---

## 📊 Flux Captcha Complet

1. **Nouveau utilisateur rejoint serveur Discord**
   ↓
2. **Bot envoie embed avec bouton "Vérifier"**
   ↓
3. **User clique → Ouvre page captcha (`/index.html`)**
   ↓
4. **User entre email + téléphone**
   ↓
5. **Site appelle `/api/captcha/generate`**
   ↓
6. **Site envoie OTP via Mailgun → `/api/captcha/send-otp`**
   ↓
7. **User rentre OTP**
   ↓
8. **Site valide OTP → `/api/captcha/verify-otp`**
   ↓
9. **Site appelle `/api/captcha/verify`**
   - Crée cookie permanent en BD
   - Appelle bot pour ajouter rôle
   ↓
10. **Bot reçoit request sur `/api/add-role`**
    - Ajoute rôle
    - Log l'action
    ↓
11. **User reçoit rôle + peut accéder serveur**

---

## 🚫 Anti-Multi-Compte

**Scénario 1 : Même utilisateur reconnecte**
- Site détecte : même user_id + nouvelle IP
- Message : "Bienvenue, reconnexion réussie"
- Accès autorisé

**Scénario 2 : Nouvel utilisateur, même IP que ancien compte**
- Site détecte : IP connue + user_id différent
- Message : "Vous rejoignez votre compte, ancien compte supprimé"
- Bot kick l'ancien user_id
- Nouvel user peut continuer

**Scénario 3 : Email Discord ≠ Email captcha**
- À chaque login, vérifier email
- Increment `attempt_count`
- Si 5 tentatives → Blacklist + kick définitif

---

## 🔑 Endpoints API

### Auth
```
POST /api/auth/discord/authorize         # Redirection OAuth2
GET  /api/auth/discord/callback          # Callback OAuth
GET  /api/auth/me                        # User actuel (JWT required)
POST /api/auth/logout                    # Logout
```

### Captcha
```
POST /api/captcha/generate               # Générer token
POST /api/captcha/send-otp               # Envoyer OTP
POST /api/captcha/verify-otp             # Vérifier OTP
POST /api/captcha/verify                 # Vérification finale + add-role
```

### Blacklist
```
GET  /api/blacklist?guild_id=X           # Lister (admin)
POST /api/blacklist/add                  # Ajouter (admin)
POST /api/blacklist/remove               # Retirer (admin)
```

### Reports
```
GET  /api/reports?guild_id=X             # Lister (admin)
POST /api/reports/create                 # Créer signalement
```

### Stats
```
GET  /api/stats                          # Stats globales
GET  /api/stats/guild?guild_id=X         # Stats serveur (admin)
```

### Bot API (Internal)
```
POST /api/kick-user                      # Bearer token required
POST /api/ban-user
POST /api/mute-user
POST /api/add-role                       # Appelé post-captcha
POST /api/remove-role
POST /api/health                         # Health check
```

---

## 📈 Tables PostgreSQL

### captcha_verification
```sql
- user_id_hash (SHA256)
- email_hash (SHA256)
- phone_hash (SHA256)
- guild_id
- ip_address
- cookie_token (permanent)
- attempt_count
- verified_at
```

### captcha_attempts
```sql
- ip_address
- user_id_hash
- guild_id
- attempt_number
- success (boolean)
- created_at
```

### website_actions, bot_actions, audit_log
- Append-only logging
- Jamais de DELETE

### blacklist_id
```sql
- user_id_hash (SHA256)
- reason ("multi-account", "email mismatch", etc)
- is_permanent (boolean)
```

### guild_admins
```sql
- user_id_hash (SHA256)
- guild_id
- can_edit_config
```

---

## 🎨 Interface (Noir/Violet Néon)

- Couleurs primaires : Violet + Cyan
- Animations : Glow effects, pulse, float
- Design moderne avec gradients
- Responsive mobile-first
- Accesibilité : Contrastes élevés

---

## ✅ Todo Checklist

- [x] Supprimer fichiers Node.js inutiles
- [x] Créer API REST PHP centralisée
- [x] Créer tables PostgreSQL
- [x] Modifier bot pour endpoints REST
- [x] OAuth2 Discord complet
- [x] OTP email
- [x] Captcha avec vérification
- [x] Interface noir/violet néon
- [ ] Sécurité maximale (rate limiting avancé)
- [ ] Tests & déploiement
- [ ] Documentation complète

---

## 🔧 Troubleshooting

**"Cannot connect to database"**
→ Vérifier `.env` DB_HOST, DB_USER, DB_PASS

**"CORS error"**
→ S'assurer que `BOT_API_URL` dans `.env` pointe vers bon host:port

**"OTP not sending"**
→ Configurer Mailgun keys, ou vérifier les logs

**"JWT token expired"**
→ Token expire après 1h - client doit se reconnecter

---

## 📞 Support

Pour toute question, consultez la documentation ou les logs :
- Bot : `console.log` output
- Website : `/website/api/audit_log` table

---

**RudyProtect v2.0** - Décembre 2025
