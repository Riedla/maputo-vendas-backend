const rotaService = require('../services/rotaService');
const { success, created, paginated, asyncHandler } = require('../utils/response');
const { parsePagination } = require('../utils/validators');

exports.iniciar = asyncHandler(async (req, res) => {
  const { id_vendedor, id_produto, latitude_origem, longitude_origem, modo_transporte } = req.body;
  const rota = await rotaService.iniciarRota(req.auth.id, {
    id_vendedor, id_produto, latitude_origem, longitude_origem, modo_transporte
  });
  created(res, rota, 'Rota iniciada');
});

exports.listar = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { rotas, total } = await rotaService.listarRotasUsuario(req.auth.id, {
    status: req.query.status, limit, offset
  });
  paginated(res, rotas, { page, limit, total });
});

exports.obter = asyncHandler(async (req, res) => {
  success(res, await rotaService.obterRota(req.params.id, req.auth));
});

exports.atualizarStatus = asyncHandler(async (req, res) => {
  const rota = await rotaService.atualizarStatus(req.params.id, req.auth.id, req.body.status);
  success(res, rota, 'Estado da rota atualizado');
});
