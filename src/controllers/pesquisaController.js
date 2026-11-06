const buscarVendedoresService = require('../services/buscarVendedoresService');
const { asyncHandler } = require('../utils/response');
const { parsePagination } = require('../utils/validators');

function responder(res, { resultados, total, raioKm }, { page, limit }, extra = {}) {
  res.json({
    success: true,
    message: 'OK',
    filtros: { raio_km: raioKm, ...extra },
    data: resultados,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 }
  });
}

/** GET /api/pesquisa/vendedores — ofertas de produtos perto do utilizador. */
exports.buscar = asyncHandler(async (req, res) => {
  const paginacao = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const q = req.query;
  const filtros = {
    lat: q.lat,
    lng: q.lng,
    raioKm: q.raio,
    idProduto: q.produto,
    idCategoria: q.categoria,
    termo: q.termo,
    precoMin: q.preco_min,
    precoMax: q.preco_max,
    ordenar: q.ordenar
  };
  const resultado = await buscarVendedoresService.buscar(filtros, paginacao, req.auth);
  responder(res, resultado, paginacao, { ordenar: filtros.ordenar || 'distancia' });
});

/** GET /api/pesquisa/proximos — vendedores perto do utilizador. */
exports.proximos = asyncHandler(async (req, res) => {
  const paginacao = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const resultado = await buscarVendedoresService.vendedoresProximos(
    { lat: req.query.lat, lng: req.query.lng, raioKm: req.query.raio },
    paginacao
  );
  responder(res, resultado, paginacao);
});
