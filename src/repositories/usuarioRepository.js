const { executeQuery } = require('../../database/connection');
const { buildSetClause } = require('../utils/sql');
const Usuario = require('../models/Usuario');

const PUBLIC_COLUMNS = 'id_usuario, nome, email, telefone, ativo, data_cadastro';
const UPDATABLE = ['nome', 'telefone', 'senha_hash'];

class UsuarioRepository {
  async findAll({ limit = 10, offset = 0 } = {}) {
    const rows = await executeQuery(
      `SELECT ${PUBLIC_COLUMNS} FROM USUARIO WHERE ativo = TRUE
       ORDER BY data_cadastro DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows.map((row) => new Usuario(row));
  }

  async findById(id) {
    const rows = await executeQuery(`SELECT ${PUBLIC_COLUMNS} FROM USUARIO WHERE id_usuario = ?`, [id]);
    return rows.length ? new Usuario(rows[0]) : null;
  }

  /** Inclui senha_hash — usar apenas para autenticação. */
  async findByIdWithHash(id) {
    const rows = await executeQuery('SELECT * FROM USUARIO WHERE id_usuario = ?', [id]);
    return rows.length ? new Usuario(rows[0]) : null;
  }

  /** Inclui senha_hash — usar apenas para autenticação. */
  async findByEmail(email) {
    const rows = await executeQuery('SELECT * FROM USUARIO WHERE email = ?', [email]);
    return rows.length ? new Usuario(rows[0]) : null;
  }

  async create({ nome, email, telefone = null, senha_hash }) {
    const result = await executeQuery(
      'INSERT INTO USUARIO (nome, email, telefone, senha_hash) VALUES (?, ?, ?, ?)',
      [nome, email, telefone, senha_hash]
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const { clause, values } = buildSetClause(data, UPDATABLE);
    if (clause) {
      await executeQuery(`UPDATE USUARIO SET ${clause} WHERE id_usuario = ?`, [...values, id]);
    }
    return this.findById(id);
  }

  /** Desativação lógica (mantém histórico). */
  async deactivate(id) {
    const result = await executeQuery('UPDATE USUARIO SET ativo = FALSE WHERE id_usuario = ?', [id]);
    return result.affectedRows > 0;
  }

  async count() {
    const rows = await executeQuery('SELECT COUNT(*) AS total FROM USUARIO WHERE ativo = TRUE');
    return rows[0].total;
  }
}

module.exports = new UsuarioRepository();
