const { pool } = require('../../config/config');

/**
 * Service de gestion de la liste noire des utilisateurs par ID
 */
class BlacklistIdService {
  /**
   * Ajouter un utilisateur à la liste noire par ID
   */
  static async add(guildId, userId, reason, addedBy) {
    // Vérifier si l'utilisateur existe déjà
    const existing = await pool.query(
      'SELECT * FROM blacklist_id WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      throw new Error('USER_ALREADY_BLACKLISTED');
    }

    const result = await pool.query(
      'INSERT INTO blacklist_id (guild_id, user_id, reason, added_by, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [guildId, userId, reason || 'Aucune raison spécifiée', addedBy]
    );

    return result.rows[0];
  }

  /**
   * Retirer un utilisateur de la liste noire par ID
   */
  static async remove(userId) {
    const result = await pool.query(
      'DELETE FROM blacklist_id WHERE user_id = $1 RETURNING *',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Mettre à jour la raison d'un utilisateur dans la liste noire
   */
  static async update(userId, newReason) {
    const result = await pool.query(
      'UPDATE blacklist_id SET reason = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [newReason, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Récupérer les informations d'un utilisateur dans la liste noire
   */
  static async get(userId) {
    const result = await pool.query(
      'SELECT * FROM blacklist_id WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Lister tous les utilisateurs dans la liste noire
   */
  static async list(limit = 25) {
    const result = await pool.query(
      'SELECT * FROM blacklist_id ORDER BY created_at DESC LIMIT $1',
      [limit]
    );

    return result.rows;
  }

  /**
   * Vérifier si un utilisateur est dans la liste noire
   */
  static async isBlacklisted(userId) {
    const result = await pool.query(
      'SELECT * FROM blacklist_id WHERE user_id = $1',
      [userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Valider le format d'un ID Discord
   */
  static validateUserId(userId) {
    return /^\d{17,19}$/.test(userId);
  }
}

module.exports = BlacklistIdService;
