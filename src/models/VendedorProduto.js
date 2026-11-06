/** Oferta de um produto por um vendedor (preço, stock e disponibilidade). */
class VendedorProduto {
  constructor(data = {}) {
    this.id_vendedor_produto = data.id_vendedor_produto ?? null;
    this.id_vendedor = data.id_vendedor ?? null;
    this.id_produto = data.id_produto ?? null;
    this.preco = data.preco ?? null;
    this.quantidade_disponivel = data.quantidade_disponivel ?? null;
    this.disponivel = data.disponivel === undefined ? true : Boolean(data.disponivel);
    this.data_atualizacao = data.data_atualizacao ?? null;
    if (data.produto_nome !== undefined) this.produto = data.produto_nome;
    if (data.unidade_medida !== undefined) this.unidade_medida = data.unidade_medida;
    if (data.categoria_nome !== undefined) this.categoria = data.categoria_nome;
  }
}

module.exports = VendedorProduto;
