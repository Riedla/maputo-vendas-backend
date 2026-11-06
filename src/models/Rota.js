class Rota {
  static STATUS = ['iniciada', 'em_andamento', 'concluida', 'cancelada'];
  static MODOS = ['driving', 'walking', 'transit', 'bicycling'];

  /** Transições de estado permitidas. */
  static TRANSICOES = {
    iniciada: ['em_andamento', 'concluida', 'cancelada'],
    em_andamento: ['concluida', 'cancelada'],
    concluida: [],
    cancelada: []
  };

  static podeTransitar(de, para) {
    return (Rota.TRANSICOES[de] || []).includes(para);
  }

  constructor(data = {}) {
    this.id_rota = data.id_rota ?? null;
    this.id_usuario = data.id_usuario ?? null;
    this.id_vendedor = data.id_vendedor ?? null;
    this.id_produto = data.id_produto ?? null;
    this.origem = { latitude: data.latitude_origem ?? null, longitude: data.longitude_origem ?? null };
    this.destino = { latitude: data.latitude_destino ?? null, longitude: data.longitude_destino ?? null };
    this.distancia_km = data.distancia_km ?? null;
    this.tempo_estimado_min = data.tempo_estimado_min ?? null;
    this.modo_transporte = data.modo_transporte ?? 'driving';
    this.status_rota = data.status_rota ?? 'iniciada';
    this.data_inicio = data.data_inicio ?? null;
    this.data_chegada = data.data_chegada ?? null;
    this.google_maps_route_id = data.google_maps_route_id ?? null;
    if (data.vendedor_nome !== undefined) this.vendedor = data.vendedor_nome;
    if (data.produto_nome !== undefined) this.produto = data.produto_nome;
  }
}

module.exports = Rota;
