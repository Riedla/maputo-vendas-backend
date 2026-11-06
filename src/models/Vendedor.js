class Vendedor {
  constructor(data = {}) {
    this.id_vendedor = data.id_vendedor ?? null;
    this.nome = data.nome ?? '';
    this.email = data.email ?? '';
    this.telefone = data.telefone ?? '';
    this.senha_hash = data.senha_hash ?? null;
    this.descricao = data.descricao ?? null;
    this.endereco = data.endereco ?? null;
    this.latitude = data.latitude ?? null;
    this.longitude = data.longitude ?? null;
    this.localizacao_atualizada_em = data.localizacao_atualizada_em ?? null;
    this.ativo = data.ativo === undefined ? true : Boolean(data.ativo);
    this.avaliacao_media = data.avaliacao_media ?? 0;
    this.total_avaliacoes = data.total_avaliacoes ?? 0;
    this.data_cadastro = data.data_cadastro ?? null;
  }

  temLocalizacao() {
    return this.latitude !== null && this.longitude !== null;
  }

  /** Representação pública (nunca expõe o hash da senha). */
  toJSON() {
    const { senha_hash, ...publico } = this;
    return publico;
  }
}

module.exports = Vendedor;
