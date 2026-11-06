class Pesquisa {
  constructor(data = {}) {
    this.id_pesquisa = data.id_pesquisa ?? null;
    this.id_usuario = data.id_usuario ?? null;
    this.id_produto = data.id_produto ?? null;
    this.termo_pesquisa = data.termo_pesquisa ?? null;
    this.latitude_usuario = data.latitude_usuario ?? null;
    this.longitude_usuario = data.longitude_usuario ?? null;
    this.raio_busca_km = data.raio_busca_km ?? 5;
    this.preco_minimo = data.preco_minimo ?? null;
    this.preco_maximo = data.preco_maximo ?? null;
    this.total_resultados = data.total_resultados ?? 0;
    this.data_pesquisa = data.data_pesquisa ?? null;
    if (data.produto_nome !== undefined) this.produto = data.produto_nome;
  }
}

module.exports = Pesquisa;
