const { executeQuery } = require('../../database/connection');
const { buildSetClause, escapeLike } = require('../utils/sql');
const Vendedor = require('../models/Vendedor');
const VendedorProduto = require('../models/VendedorProduto');

const PUBLIC_COLUMNS = `id_vendedor, nome, email, telefone, descricao, endereco, latitude, longitude,
  localizacao_atualizada_em, ativo, avaliacao_media, total_avaliacoes, data_cadastro`;
const UPDATABLE = ['nome', 'telefone', 'descricao', 'endereco', 'senha_hash'];
const OFERTA_UPDATABLE = ['preco', 'quantidade_disponivel', 'disponivel'];

const OFERTA_SELECT = `
  SELECT vp.*, p.nome AS produto_nome, p.unidade_medida, c.nome AS categoria_nome
  FROM VENDEDOR_PRODUTO vp
  JOIN PRODUTO p ON p.id_produto = vp.id_produto
  JOIN CATEGORIA c ON c.id_categoria = p.id_categoria`;

class VendedorRepository {
  _filters({ nome } = {}) {
    const where = ['ativo = TRUE'];
    const params = [];
    if (nome) {
      where.push('nome LIKE ?');
      params.push(`%${escapeLike(nome)}%`);
    }
    return { where: where.join(' AND '), params };
  }

  async findAll({ nome, limit = 10, offset = 0 } = {}) {
    const { where, params } = this._filters({ nome });
    const rows = await executeQuery(
      `SELECT ${PUBLIC_COLUMNS} FROM VENDEDOR WHERE ${where}
       ORDER BY avaliacao_media DESC, nome ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return rows.map((row) => new Vendedor(row));
  }

  async count({ nome } = {}) {
    const { where, params } = this._filters({ nome });
    const rows = await executeQuery(`SELECT COUNT(*) AS total FROM VENDEDOR WHERE ${where}`, params);
    return rows[0].total;
  }

  async findById(id) {
    const rows = await executeQuery(`SELECT ${PUBLIC_COLUMNS} FROM VENDEDOR WHERE id_vendedor = ?`, [id]);
    return rows.length ? new Vendedor(rows[0]) : null;
  }

  /** Inclui senha_hash — usar apenas para autenticação. */
  async findByIdWithHash(id) {
    const rows = await executeQuery('SELECT * FROM VENDEDOR WHERE id_vendedor = ?', [id]);
    return rows.length ? new Vendedor(rows[0]) : null;
  }

  /** Inclui senha_hash — usar apenas para autenticação. */
  async findByEmail(email) {
    const rows = await executeQuery('SELECT * FROM VENDEDOR WHERE email = ?', [email]);
    return rows.length ? new Vendedor(rows[0]) : null;
  }

  async create({ nome, email, telefone, senha_hash, descricao = null, endereco = null, latitude = null, longitude = null }) {
    const temLocalizacao = latitude !== null && longitude !== null;
    const result = await executeQuery(
      `INSERT INTO VENDEDOR
         (nome, email, telefone, senha_hash, descricao, endereco, latitude, longitude, localizacao_atualizada_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${temLocalizacao ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [nome, email, telefone, senha_hash, descricao, endereco, latitude, longitude]
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const { clause, values } = buildSetClause(data, UPDATABLE);
    if (clause) {
      await executeQuery(`UPDATE VENDEDOR SET ${clause} WHERE id_vendedor = ?`, [...values, id]);
    }
    return this.findById(id);
  }

  async updateLocalizacao(id, { latitude, longitude, endereco }) {
    const params = [latitude, longitude];
    let extra = '';
    if (endereco !== undefined) {
      extra = ', endereco = ?';
      params.push(endereco);
    }
    await executeQuery(
      `UPDATE VENDEDOR SET latitude = ?, longitude = ?, localizacao_atualizada_em = CURRENT_TIMESTAMP${extra}
       WHERE id_vendedor = ?`,
      [...params, id]
    );
    return this.findById(id);
  }

  async deactivate(id) {
    const result = await executeQuery('UPDATE VENDEDOR SET ativo = FALSE WHERE id_vendedor = ?', [id]);
    return result.affectedRows > 0;
  }

  // ---------- Ofertas (VENDEDOR_PRODUTO) ----------

  async listOfertas(idVendedor, { apenasDisponiveis = false } = {}) {
    const filtro = apenasDisponiveis ? 'AND vp.disponivel = TRUE AND p.ativo = TRUE' : '';
    const rows = await executeQuery(
      `${OFERTA_SELECT} WHERE vp.id_vendedor = ? ${filtro} ORDER BY c.nome, p.nome`,
      [idVendedor]
    );
    return rows.map((row) => new VendedorProduto(row));
  }

  async findOferta(idVendedor, idProduto) {
    const rows = await executeQuery(
      `${OFERTA_SELECT} WHERE vp.id_vendedor = ? AND vp.id_produto = ?`,
      [idVendedor, idProduto]
    );
    return rows.length ? new VendedorProduto(rows[0]) : null;
  }

  async createOferta(idVendedor, { id_produto, preco, quantidade_disponivel = null, disponivel = true }) {
    await executeQuery(
      `INSERT INTO VENDEDOR_PRODUTO (id_vendedor, id_produto, preco, quantidade_disponivel, disponivel)
       VALUES (?, ?, ?, ?, ?)`,
      [idVendedor, id_produto, preco, quantidade_disponivel, disponivel]
    );
    return this.findOferta(idVendedor, id_produto);
  }

  async updateOferta(idVendedor, idProduto, data) {
    const { clause, values } = buildSetClause(data, OFERTA_UPDATABLE);
    if (clause) {
      await executeQuery(
        `UPDATE VENDEDOR_PRODUTO SET ${clause} WHERE id_vendedor = ? AND id_produto = ?`,
        [...values, idVendedor, idProduto]
      );
    }
    return this.findOferta(idVendedor, idProduto);
  }

  async deleteOferta(idVendedor, idProduto) {
    const result = await executeQuery(
      'DELETE FROM VENDEDOR_PRODUTO WHERE id_vendedor = ? AND id_produto = ?',
      [idVendedor, idProduto]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new VendedorRepository();
