const { executeQuery } = require('../../database/connection');
const { buildSetClause } = require('../utils/sql');
const Avaliacao = require('../models/Avaliacao');

const SELECT = `
  SELECT a.*, u.nome AS usuario_nome, v.nome AS vendedor_nome
  FROM AVALIACAO a
  JOIN USUARIO u ON u.id_usuario = a.id_usuario
  JOIN VENDEDOR v ON v.id_vendedor = a.id_vendedor`;

class AvaliacaoRepository {
  async create({ id_usuario, id_vendedor, id_rota = null, nota, comentario = null }) {
    const result = await executeQuery(
      'INSERT INTO AVALIACAO (id_usuario, id_vendedor, id_rota, nota, comentario) VALUES (?, ?, ?, ?, ?)',
      [id_usuario, id_vendedor, id_rota, nota, comentario]
    );
    return this.findById(result.insertId);
  }

  async findById(id) {
    const rows = await executeQuery(`${SELECT} WHERE a.id_avaliacao = ?`, [id]);
    return rows.length ? new Avaliacao(rows[0]) : null;
  }

  /**
   * Avaliação existente do utilizador para o vendedor/rota.
   * (A UNIQUE KEY não impede duplicados quando id_rota é NULL.)
   */
  async findExistente(idUsuario, idVendedor, idRota = null) {
    const rows = await executeQuery(
      `SELECT id_avaliacao FROM AVALIACAO
       WHERE id_usuario = ? AND id_vendedor = ? AND id_rota <=> ?`,
      [idUsuario, idVendedor, idRota]
    );
    return rows.length ? rows[0].id_avaliacao : null;
  }

  async findByVendedor(idVendedor, { limit = 10, offset = 0 } = {}) {
    const rows = await executeQuery(
      `${SELECT} WHERE a.id_vendedor = ? ORDER BY a.data_avaliacao DESC, a.id_avaliacao DESC LIMIT ? OFFSET ?`,
      [idVendedor, limit, offset]
    );
    return rows.map((row) => new Avaliacao(row));
  }

  async countByVendedor(idVendedor) {
    const rows = await executeQuery('SELECT COUNT(*) AS total FROM AVALIACAO WHERE id_vendedor = ?', [idVendedor]);
    return rows[0].total;
  }

  /** Distribuição de notas (1 a 5) de um vendedor. */
  async distribuicaoNotas(idVendedor) {
    const rows = await executeQuery(
      'SELECT nota, COUNT(*) AS total FROM AVALIACAO WHERE id_vendedor = ? GROUP BY nota',
      [idVendedor]
    );
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rows.forEach((r) => { dist[r.nota] = r.total; });
    return dist;
  }

  async findByUsuario(idUsuario, { limit = 10, offset = 0 } = {}) {
    const rows = await executeQuery(
      `${SELECT} WHERE a.id_usuario = ? ORDER BY a.data_avaliacao DESC, a.id_avaliacao DESC LIMIT ? OFFSET ?`,
      [idUsuario, limit, offset]
    );
    return rows.map((row) => new Avaliacao(row));
  }

  async countByUsuario(idUsuario) {
    const rows = await executeQuery('SELECT COUNT(*) AS total FROM AVALIACAO WHERE id_usuario = ?', [idUsuario]);
    return rows[0].total;
  }

  async update(id, data) {
    const { clause, values } = buildSetClause(data, ['nota', 'comentario']);
    if (clause) {
      await executeQuery(`UPDATE AVALIACAO SET ${clause} WHERE id_avaliacao = ?`, [...values, id]);
    }
    return this.findById(id);
  }

  async delete(id) {
    const result = await executeQuery('DELETE FROM AVALIACAO WHERE id_avaliacao = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = new AvaliacaoRepository();
