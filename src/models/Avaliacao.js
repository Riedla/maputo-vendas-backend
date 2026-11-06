class Avaliacao {
  constructor(data = {}) {
    this.id_avaliacao = data.id_avaliacao ?? null;
    this.id_usuario = data.id_usuario ?? null;
    this.id_vendedor = data.id_vendedor ?? null;
    this.id_rota = data.id_rota ?? null;
    this.nota = data.nota ?? null;
    this.comentario = data.comentario ?? null;
    this.data_avaliacao = data.data_avaliacao ?? null;
    if (data.usuario_nome !== undefined) this.usuario = data.usuario_nome;
    if (data.vendedor_nome !== undefined) this.vendedor = data.vendedor_nome;
  }
}

module.exports = Avaliacao;
