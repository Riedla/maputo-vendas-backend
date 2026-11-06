class Produto {
  constructor(data = {}) {
    this.id_produto = data.id_produto ?? null;
    this.nome = data.nome ?? '';
    this.id_categoria = data.id_categoria ?? null;
    this.unidade_medida = data.unidade_medida ?? '';
    this.ativo = data.ativo === undefined ? true : Boolean(data.ativo);
    if (data.categoria_nome !== undefined) this.categoria = data.categoria_nome;
    if (data.total_vendedores !== undefined) this.total_vendedores = data.total_vendedores;
    if (data.preco_minimo !== undefined) this.preco_minimo = data.preco_minimo;
  }
}

module.exports = Produto;
