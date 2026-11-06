const { executeQuery } = require('../../database/connection');
const { escapeLike } = require('../utils/sql');
const { boundingBox, EARTH_RADIUS_KM } = require('../utils/validators');
const Pesquisa = require('../models/Pesquisa');

// Distância Haversine (km) entre o ponto (?, ?) e o vendedor v
const DISTANCE_SQL = `(${EARTH_RADIUS_KM} * 2 * ASIN(SQRT(
    POW(SIN(RADIANS(v.latitude - ?) / 2), 2) +
    COS(RADIANS(?)) * COS(RADIANS(v.latitude)) * POW(SIN(RADIANS(v.longitude - ?) / 2), 2)
  )))`;

const ORDENACAO = {
  distancia: 'distancia_km ASC, preco ASC',
  preco: 'preco ASC, distancia_km ASC',
  avaliacao: 'avaliacao_media DESC, distancia_km ASC'
};

class PesquisaRepository {
  /**
   * Monta a query base de ofertas próximas. A bounding box permite usar
   * o índice (latitude, longitude); a condição exata é aplicada sobre a distância.
   */
  _buildOfertasQuery({ lat, lng, raioKm, idProduto, idCategoria, termo, precoMin, precoMax }) {
    const box = boundingBox(lat, lng, raioKm);
    const where = [
      'vp.disponivel = TRUE',
      '(vp.quantidade_disponivel IS NULL OR vp.quantidade_disponivel > 0)',
      'v.ativo = TRUE',
      'p.ativo = TRUE',
      'v.latitude BETWEEN ? AND ?',
      'v.longitude BETWEEN ? AND ?'
    ];
    const params = [lat, lat, lng, box.minLat, box.maxLat, box.minLng, box.maxLng];

    if (idProduto) {
      where.push('p.id_produto = ?');
      params.push(idProduto);
    }
    if (idCategoria) {
      where.push('p.id_categoria = ?');
      params.push(idCategoria);
    }
    if (termo) {
      where.push('p.nome LIKE ?');
      params.push(`%${escapeLike(termo)}%`);
    }
    if (precoMin !== undefined && precoMin !== null) {
      where.push('vp.preco >= ?');
      params.push(precoMin);
    }
    if (precoMax !== undefined && precoMax !== null) {
      where.push('vp.preco <= ?');
      params.push(precoMax);
    }

    const sql = `
      SELECT * FROM (
        SELECT v.id_vendedor, v.nome AS vendedor_nome, v.telefone, v.endereco,
               v.latitude, v.longitude, v.avaliacao_media, v.total_avaliacoes,
               p.id_produto, p.nome AS produto_nome, p.unidade_medida,
               c.id_categoria, c.nome AS categoria_nome,
               vp.preco, vp.quantidade_disponivel, vp.data_atualizacao,
               ${DISTANCE_SQL} AS distancia_km
        FROM VENDEDOR_PRODUTO vp
        JOIN VENDEDOR v ON v.id_vendedor = vp.id_vendedor
        JOIN PRODUTO p ON p.id_produto = vp.id_produto
        JOIN CATEGORIA c ON c.id_categoria = p.id_categoria
        WHERE ${where.join(' AND ')}
      ) ofertas
      WHERE distancia_km <= ?`;
    params.push(raioKm);
    return { sql, params };
  }

  async buscarOfertas(filtros, { ordenar = 'distancia', limit = 20, offset = 0 } = {}) {
    const { sql, params } = this._buildOfertasQuery(filtros);
    const orderBy = ORDENACAO[ordenar] || ORDENACAO.distancia;
    const [rows, countRows] = await Promise.all([
      executeQuery(`${sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, offset]),
      executeQuery(`SELECT COUNT(*) AS total FROM (${sql}) t`, params)
    ]);
    return { rows, total: countRows[0].total };
  }

  /** Vendedores ativos dentro do raio (sem filtro de produto). */
  async vendedoresProximos({ lat, lng, raioKm, limit = 20, offset = 0 }) {
    const box = boundingBox(lat, lng, raioKm);
    const base = `
      SELECT * FROM (
        SELECT v.id_vendedor, v.nome, v.telefone, v.descricao, v.endereco,
               v.latitude, v.longitude, v.avaliacao_media, v.total_avaliacoes,
               (SELECT COUNT(*) FROM VENDEDOR_PRODUTO vp
                 WHERE vp.id_vendedor = v.id_vendedor AND vp.disponivel = TRUE) AS total_produtos,
               ${DISTANCE_SQL} AS distancia_km
        FROM VENDEDOR v
        WHERE v.ativo = TRUE AND v.latitude BETWEEN ? AND ? AND v.longitude BETWEEN ? AND ?
      ) proximos
      WHERE distancia_km <= ?`;
    const params = [lat, lat, lng, box.minLat, box.maxLat, box.minLng, box.maxLng, raioKm];
    const [rows, countRows] = await Promise.all([
      executeQuery(`${base} ORDER BY distancia_km ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      executeQuery(`SELECT COUNT(*) AS total FROM (${base}) t`, params)
    ]);
    return { rows, total: countRows[0].total };
  }

  // ---------- Histórico ----------

  async create(p) {
    const result = await executeQuery(
      `INSERT INTO PESQUISA (id_usuario, id_produto, termo_pesquisa, latitude_usuario, longitude_usuario,
                             raio_busca_km, preco_minimo, preco_maximo, total_resultados)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id_usuario, p.id_produto ?? null, p.termo_pesquisa ?? null, p.latitude_usuario, p.longitude_usuario,
        p.raio_busca_km, p.preco_minimo ?? null, p.preco_maximo ?? null, p.total_resultados ?? 0
      ]
    );
    return result.insertId;
  }

  async findByUsuario(idUsuario, { limit = 10, offset = 0 } = {}) {
    const rows = await executeQuery(
      `SELECT ps.*, p.nome AS produto_nome
       FROM PESQUISA ps LEFT JOIN PRODUTO p ON p.id_produto = ps.id_produto
       WHERE ps.id_usuario = ?
       ORDER BY ps.data_pesquisa DESC, ps.id_pesquisa DESC
       LIMIT ? OFFSET ?`,
      [idUsuario, limit, offset]
    );
    return rows.map((row) => new Pesquisa(row));
  }

  async countByUsuario(idUsuario) {
    const rows = await executeQuery('SELECT COUNT(*) AS total FROM PESQUISA WHERE id_usuario = ?', [idUsuario]);
    return rows[0].total;
  }

  async deleteByUsuario(idUsuario) {
    const result = await executeQuery('DELETE FROM PESQUISA WHERE id_usuario = ?', [idUsuario]);
    return result.affectedRows;
  }

  /** Produtos mais pesquisados nos últimos N dias. */
  async maisPesquisados({ dias = 30, limit = 10 } = {}) {
    return executeQuery(
      `SELECT p.id_produto, p.nome, COUNT(*) AS total_pesquisas
       FROM PESQUISA ps JOIN PRODUTO p ON p.id_produto = ps.id_produto
       WHERE ps.data_pesquisa >= (CURRENT_TIMESTAMP - INTERVAL ? DAY)
       GROUP BY p.id_produto, p.nome
       ORDER BY total_pesquisas DESC
       LIMIT ?`,
      [dias, limit]
    );
  }
}

module.exports = new PesquisaRepository();
