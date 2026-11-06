class Categoria {
  constructor(data = {}) {
    this.id_categoria = data.id_categoria ?? null;
    this.nome = data.nome ?? '';
    this.ativo = data.ativo === undefined ? true : Boolean(data.ativo);
    if (data.total_produtos !== undefined) this.total_produtos = data.total_produtos;
  }
}

module.exports = Categoria;
