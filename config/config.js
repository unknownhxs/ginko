const { Pool } = require('pg');
require('dotenv').config();

// ============================================
// CONFIGURATION DE LA BASE DE DONNÉES
// ============================================

// Créer un pool de connexions PostgreSQL
// Le pool ne se connecte pas immédiatement, seulement quand une requête est exécutée
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10, // Nombre maximum de connexions dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Augmenté à 10 secondes pour les connexions distantes
};

// Configurer SSL pour CockroachDB ou autres bases de données nécessitant SSL
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL.toLowerCase();
  // CockroachDB nécessite SSL mais avec rejectUnauthorized: false pour sslmode=require
  // Pour sslmode=verify-full, vous devriez fournir un certificat, mais pour simplifier on utilise false
  if (dbUrl.includes('cockroachlabs') || dbUrl.includes('sslmode=require') || dbUrl.includes('sslmode=verify-full')) {
    poolConfig.ssl = {
      rejectUnauthorized: false, // Désactivé pour permettre la connexion à CockroachDB
    };
  } else if (dbUrl.includes('sslmode')) {
    // Pour d'autres configurations SSL
    poolConfig.ssl = true;
  }
} else {
  console.warn('⚠️ DATABASE_URL n\'est pas défini dans les variables d\'environnement');
}

// Gérer les erreurs du pool
const pool = new Pool(poolConfig);

// Écouter les erreurs du pool (connexions perdues, etc.)
pool.on('error', (err) => {
  console.error('⚠️ Erreur inattendue du pool de connexions:', err.message || err.toString());
});

// Tester la connexion de manière asynchrone (sans bloquer le démarrage)
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✓ Connexion à la base de données réussie');
  })
  .catch(err => {
    const errorMessage = err.message || err.toString() || 'Erreur inconnue';
    const errorCode = err.code || 'N/A';
    console.error('⚠️ Erreur de connexion à la base de données:');
    console.error(`   Message: ${errorMessage}`);
    console.error(`   Code: ${errorCode}`);
    if (err.stack) {
      console.error(`   Stack: ${err.stack.split('\n')[0]}`);
    }
    if (!process.env.DATABASE_URL) {
      console.error('   ⚠️ DATABASE_URL n\'est pas défini dans le fichier .env');
    } else {
      // Afficher un aperçu de l'URL (masquer le mot de passe)
      const urlPreview = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
      console.error(`   URL: ${urlPreview.substring(0, 80)}...`);
    }
    console.error('⚠️ Le bot continuera de fonctionner, mais les fonctionnalités nécessitant la base de données ne seront pas disponibles.');
  });

// ============================================
// INITIALISATION DE LA BASE DE DONNÉES
// ============================================

async function initDatabase() {
  let client;
  try {
    console.log('⏳ Initialisation de la base de données...\n');

    // Vérifier la connexion d'abord
    console.log('🔌 Test de connexion à la base de données...');
    await pool.query('SELECT NOW()');
    console.log('✓ Connexion réussie\n');

    // Table report (pour les signalements généraux)
    console.log('📋 Création de la table report...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        reporter_id VARCHAR(255) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        proof TEXT,
        channel_id VARCHAR(255),
        message_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table report créée/vérifiée');

    // Table report_user (pour les signalements d'utilisateurs)
    console.log('📋 Création de la table report_user...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_user (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        reporter_id VARCHAR(255) NOT NULL,
        reported_user_id VARCHAR(255) NOT NULL,
        reason TEXT NOT NULL,
        proof TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table report_user créée/vérifiée');

    // Table blacklist (for general blacklist - legacy table)
    console.log('📋 Création de la table blacklist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blacklist (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        reason TEXT,
        added_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table blacklist créée/vérifiée');

    // Table blacklist_id (for user ID blacklist)
    console.log('📋 Création de la table blacklist_id...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blacklist_id (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        reason TEXT,
        added_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table blacklist_id créée/vérifiée');

    // Table blacklist_ip (for MAC address blacklist)
    console.log('📋 Création de la table blacklist_ip...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blacklist_ip (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        mac_address VARCHAR(17) NOT NULL UNIQUE,
        reason TEXT,
        added_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table blacklist_ip créée/vérifiée');

    // Table raid_config (pour la configuration anti-raid)
    console.log('📋 Création de la table raid_config...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS raid_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL UNIQUE,
        enabled BOOLEAN DEFAULT true,
        max_joins_per_minute INTEGER DEFAULT 5,
        max_accounts_age_hours INTEGER DEFAULT 24,
        auto_ban_enabled BOOLEAN DEFAULT false,
        log_channel_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table raid_config créée/vérifiée');

    // Table mutes (pour les utilisateurs mutés)
    console.log('📋 Création de la table mutes...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mutes (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        reason TEXT,
        muted_by VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(guild_id, user_id)
      )
    `);
    console.log('✓ Table mutes créée/vérifiée');

    // Table captcha_config (pour la configuration du captcha)
    console.log('📋 Création de la table captcha_config...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS captcha_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL UNIQUE,
        enabled BOOLEAN DEFAULT false,
        channel_id VARCHAR(255),
        role_id VARCHAR(255),
        timeout_minutes INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table captcha_config créée/vérifiée');

    console.log('\n✅ Base de données initialisée avec succès!');
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation de la base de données:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code || 'N/A');
    if (error.stack) {
      console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    
    // Vérifier si c'est un problème de connexion
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('\n⚠️ Impossible de se connecter à la base de données.');
      console.error('   Vérifiez que:');
      console.error('   1. La variable DATABASE_URL est correctement définie dans .env');
      console.error('   2. La base de données est accessible');
      console.error('   3. Les identifiants sont corrects');
    } else if (error.code === '42P01') {
      console.error('\n⚠️ Table manquante. Vérifiez les permissions de la base de données.');
    } else if (error.code === '23505') {
      console.error('\n⚠️ Contrainte unique violée. Certaines données existent déjà.');
    }
    
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('\n✓ Initialisation terminée avec succès');
      // Attendre un peu avant de fermer pour que les logs soient visibles
      setTimeout(() => {
        pool.end();
        process.exit(0);
      }, 1000);
    })
    .catch((error) => {
      console.error('\n❌ Échec de l\'initialisation');
      // Fermer le pool proprement
      pool.end().catch(() => {});
      process.exit(1);
    });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  pool,
  initDatabase
};

// Export par défaut du pool pour la compatibilité avec les anciens imports
module.exports.default = pool;
