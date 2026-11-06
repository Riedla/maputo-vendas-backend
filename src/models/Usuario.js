class Usuario {
  constructor(data = {}) {
    this.id_usuario = data.id_usuario ?? null;
    this.nome = data.nome ?? '';
    this.email = data.email ?? '';
    this.telefone = data.telefone ?? null;
    this.senha_hash = data.senha_hash ?? null;
    this.ativo = data.ativo === undefined ? true : Boolean(data.ativo);
    this.data_cadastro = data.data_cadastro ?? null;
  }

  /** Representação pública (nunca expõe o hash da senha). */
  toJSON() {
    const { senha_hash, ...publico } = this;
    return publico;
  }
}

module.exports = Usuario;
