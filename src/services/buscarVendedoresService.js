const pesquisaRepository = require('../repositories/pesquisaRepository');
const produtoRepository = require('../repositories/produtoRepository');
const logger = require('../utils/logger');
const { AppError } = require('../utils/response');

const RAIO_PADRAO_KM = 5;
const RAIO_MAXIMO_KM = 50;

const round2 = (n) => Math.round(n * 100) / 100;

function mapOferta(row) {
  return {
    vendedor: {
      id_vendedor: row.id_vendedor,
      nome: row.vendedor_nome,
      telefone: row.telefone,
      endereco: row.endereco,
      latitude: row.latitude,
      longitude: row.longitude,
      avaliacao_media: row.avaliacao_media,
      total_avaliacoes: row.total_avaliacoes
    },
    produto: {
      id_produto: row.id_produto,
      nome: row.produto_nome,
      unidade_medida: row.unidade_medida,
      id_categoria: row.id_categoria,
      categoria: row.categoria_nome
    },
    preco: row.preco,
    quantidade_disponivel: row.quantidade_disponivel,
    atualizado_em: row.data_atualizacao,
    distancia_km: round2(row.distancia_km)
  };
}

/**
 * Procura ofertas de produtos em vendedores próximos de (lat, lng).
 * Se o pedido vier de um utilizador autenticado, regista a pesquisa no histórico.
 */
async function buscar(filtros, { page, limit, offset }, auth) {
  const raioKm = Math.min(filtros.raioKm ?? RAIO_PADRAO_KM, RAIO_MAXIMO_KM);
  const { precoMin, precoMax, idProduto } = filtros;

  if (precoMin != null && precoMax != null && precoMin > precoMax) {
    throw AppError.badRequest('preco_min não pode ser maior que preco_max');
  }
  if (idProduto && !(await produtoRepository.findById(idProduto))) {
    throw AppError.notFound('Produto não encontrado');
  }

  const { rows, total } = await pesquisaRepository.buscarOfertas(
    { ...filtros, raioKm },
    { ordenar: filtros.ordenar, limit, offset }
  );

  // Regista apenas a 1ª página para não duplicar o histórico ao paginar
  if (auth?.tipo === 'usuario' && page === 1) {
    pesquisaRepository
      .create({
        id_usuario: auth.id,
        id_produto: idProduto,
        termo_pesquisa: filtros.termo,
        latitude_usuario: filtros.lat,
        longitude_usuario: filtros.lng,
        raio_busca_km: raioKm,
        preco_minimo: precoMin,
        preco_maximo: precoMax,
        total_resultados: total
      })
      .catch((err) => logger.warn('Falha ao registar pesquisa', { error: err.message }));
  }

  return { resultados: rows.map(mapOferta), total, raioKm };
}

async function vendedoresProximos({ lat, lng, raioKm }, { limit, offset }) {
  const raio = Math.min(raioKm ?? RAIO_PADRAO_KM, RAIO_MAXIMO_KM);
  const { rows, total } = await pesquisaRepository.vendedoresProximos({ lat, lng, raioKm: raio, limit, offset });
  return {
    resultados: rows.map((r) => ({ ...r, distancia_km: round2(r.distancia_km) })),
    total,
    raioKm: raio
  };
}

module.exports = { buscar, vendedoresProximos, RAIO_PADRAO_KM, RAIO_MAXIMO_KM };
