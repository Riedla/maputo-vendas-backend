const { executeQuery } = require('../../database/connection');
const { escapeLike } = require('../utils/sql');
const Produto = require('../models/Produto');
const Categoria = require('../models/Categoria');

class ProdutoRepository {
  _filters({ nome, idCategoria } = {}) {
    const where = ['p.ativo = TRUE'];
    const params = [];
    if (nome) {
      where.push('p.nome LIKE ?');
      params.push(`%${escapeLike(nome)}%`);
    }
    if (idCategoria) {
      where.push('p.id_categoria = ?');
      params.push(idCategoria);
    }
    return { where: where.join(' AND '), params };
  }

  /** Lista produtos com o nº de vendedores que os têm disponíveis e o preço mínimo. */
  async findAll({ nome, idCategoria, limit = 20, offset = 0 } = {}) {
    const { where, params } = this._filters({ nome, idCategoria });
    const rows = await executeQuery(
      `SELECT p.*, c.nome AS categoria_nome,
              COUNT(v.id_vendedor) AS total_vendedores,
              MIN(CASE WHEN v.id_vendedor IS NOT NULL THEN vp.preco END) AS preco_minimo
       FROM PRODUTO p
       JOIN CATEGORIA c ON c.id_categoria = p.id_categoria
       LEFT JOIN VENDEDOR_PRODUTO vp ON vp.id_produto = p.id_produto AND vp.disponivel = TRUE
       LEFT JOIN VENDEDOR v ON v.id_vendedor = vp.id_vendedor AND v.ativo = TRUE
       WHERE ${where}
       GROUP BY p.id_produto
       ORDER BY p.nome ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return rows.map((row) => new Produto(row));
  }

  async count({ nome, idCategoria } = {}) {
    const { where, params } = this._filters({ nome, idCategoria });
    const rows = await executeQuery(`SELECT COUNT(*) AS total FROM PRODUTO p WHERE ${where}`, params);
    return rows[0].total;
  }

  async findById(id) {
    const rows = await executeQuery(
      `SELECT p.*, c.nome AS categoria_nome
       FROM PRODUTO p JOIN CATEGORIA c ON c.id_categoria = p.id_categoria
       WHERE p.id_produto = ?`,
      [id]
    );
    return rows.length ? new Produto(rows[0]) : null;
  }

  async findCategorias() {
    const rows = await executeQuery(
      `SELECT c.*, COUNT(p.id_produto) AS total_produtos
       FROM CATEGORIA c
       LEFT JOIN PRODUTO p ON p.id_categoria = c.id_categoria AND p.ativo = TRUE
       WHERE c.ativo = TRUE
       GROUP BY c.id_categoria
       ORDER BY c.nome`
    );
    return rows.map((row) => new Categoria(row));
  }
}

module.exports = new ProdutoRepository();
