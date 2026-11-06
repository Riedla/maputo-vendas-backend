const { executeQuery } = require('../../database/connection');
const Rota = require('../models/Rota');

const SELECT = `
  SELECT r.*, v.nome AS vendedor_nome, p.nome AS produto_nome
  FROM ROTA r
  JOIN VENDEDOR v ON v.id_vendedor = r.id_vendedor
  JOIN PRODUTO p ON p.id_produto = r.id_produto`;

class RotaRepository {
  async create(r) {
    const result = await executeQuery(
      `INSERT INTO ROTA (id_usuario, id_vendedor, id_produto, latitude_origem, longitude_origem,
                         latitude_destino, longitude_destino, distancia_km, tempo_estimado_min,
                         modo_transporte, google_maps_route_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id_usuario, r.id_vendedor, r.id_produto, r.latitude_origem, r.longitude_origem,
        r.latitude_destino, r.longitude_destino, r.distancia_km, r.tempo_estimado_min,
        r.modo_transporte, r.google_maps_route_id ?? null
      ]
    );
    return this.findById(result.insertId);
  }

  async findById(id) {
    const rows = await executeQuery(`${SELECT} WHERE r.id_rota = ?`, [id]);
    return rows.length ? new Rota(rows[0]) : null;
  }

  _filters(column, id, status) {
    const where = [`r.${column} = ?`];
    const params = [id];
    if (status) {
      where.push('r.status_rota = ?');
      params.push(status);
    }
    return { where: where.join(' AND '), params };
  }

  async findBy(column, id, { status, limit = 10, offset = 0 } = {}) {
    const { where, params } = this._filters(column, id, status);
    const rows = await executeQuery(
      `${SELECT} WHERE ${where} ORDER BY r.data_inicio DESC, r.id_rota DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return rows.map((row) => new Rota(row));
  }

  async countBy(column, id, { status } = {}) {
    const { where, params } = this._filters(column, id, status);
    const rows = await executeQuery(`SELECT COUNT(*) AS total FROM ROTA r WHERE ${where}`, params);
    return rows[0].total;
  }

  findByUsuario(idUsuario, opts) { return this.findBy('id_usuario', idUsuario, opts); }
  countByUsuario(idUsuario, opts) { return this.countBy('id_usuario', idUsuario, opts); }
  findByVendedor(idVendedor, opts) { return this.findBy('id_vendedor', idVendedor, opts); }
  countByVendedor(idVendedor, opts) { return this.countBy('id_vendedor', idVendedor, opts); }

  async updateStatus(id, status) {
    const chegada = status === 'concluida' ? ', data_chegada = COALESCE(data_chegada, CURRENT_TIMESTAMP)' : '';
    await executeQuery(`UPDATE ROTA SET status_rota = ?${chegada} WHERE id_rota = ?`, [status, id]);
    return this.findById(id);
  }
}

module.exports = new RotaRepository();
