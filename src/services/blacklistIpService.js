const { pool } = require('../../config/config');

/**
 * Service de gestion de la liste noire des adresses MAC
 */
class BlacklistIpService {
  /**
   * Ajouter une adresse MAC à la liste noire
   */
  static async add(guildId, macAddress, reason, addedBy) {
    // Normaliser l'adresse MAC
    const normalizedMac = this.normalizeMacAddress(macAddress);

    // Vérifier si l'adresse MAC existe déjà
    const existing = await pool.query(
      'SELECT * FROM blacklist_ip WHERE mac_address = $1',
      [normalizedMac]
    );

    if (existing.rows.length > 0) {
      throw new Error('MAC_ALREADY_BLACKLISTED');
    }

    const result = await pool.query(
      'INSERT INTO blacklist_ip (guild_id, mac_address, reason, added_by, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [guildId, normalizedMac, reason || 'Aucune raison spécifiée', addedBy]
    );

    return result.rows[0];
  }

  /**
   * Retirer une adresse MAC de la liste noire
   */
  static async remove(macAddress) {
    const normalizedMac = this.normalizeMacAddress(macAddress);

    const result = await pool.query(
      'DELETE FROM blacklist_ip WHERE mac_address = $1 RETURNING *',
      [normalizedMac]
    );

    if (result.rows.length === 0) {
      throw new Error('MAC_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Mettre à jour la raison d'une adresse MAC dans la liste noire
   */
  static async update(macAddress, newReason) {
    const normalizedMac = this.normalizeMacAddress(macAddress);

    const result = await pool.query(
      'UPDATE blacklist_ip SET reason = $1, updated_at = NOW() WHERE mac_address = $2 RETURNING *',
      [newReason, normalizedMac]
    );

    if (result.rows.length === 0) {
      throw new Error('MAC_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Récupérer les informations d'une adresse MAC dans la liste noire
   */
  static async get(macAddress) {
    const normalizedMac = this.normalizeMacAddress(macAddress);

    const result = await pool.query(
      'SELECT * FROM blacklist_ip WHERE mac_address = $1',
      [normalizedMac]
    );

    if (result.rows.length === 0) {
      throw new Error('MAC_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Lister toutes les adresses MAC dans la liste noire
   */
  static async list(limit = 25) {
    const result = await pool.query(
      'SELECT * FROM blacklist_ip ORDER BY created_at DESC LIMIT $1',
      [limit]
    );

    return result.rows;
  }

  /**
   * Vérifier si une adresse MAC est dans la liste noire
   */
  static async isBlacklisted(macAddress) {
    const normalizedMac = this.normalizeMacAddress(macAddress);

    const result = await pool.query(
      'SELECT * FROM blacklist_ip WHERE mac_address = $1',
      [normalizedMac]
    );

    return result.rows.length > 0;
  }

  /**
   * Valider le format d'une adresse MAC
   */
  static validateMacAddress(macAddress) {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(macAddress);
  }

  /**
   * Normaliser une adresse MAC (majuscules et format avec :)
   */
  static normalizeMacAddress(macAddress) {
    return macAddress.toUpperCase().replace(/-/g, ':');
  }
}

module.exports = BlacklistIpService;
