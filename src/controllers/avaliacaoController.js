const avaliacaoService = require('../services/avaliacaoService');
const { success, created, asyncHandler } = require('../utils/response');

exports.criar = asyncHandler(async (req, res) => {
  const { id_vendedor, id_rota, nota, comentario } = req.body;
  const avaliacao = await avaliacaoService.criar(req.auth.id, { id_vendedor, id_rota, nota, comentario });
  created(res, avaliacao, 'Avaliação registada');
});

exports.atualizar = asyncHandler(async (req, res) => {
  const { nota, comentario } = req.body;
  const avaliacao = await avaliacaoService.atualizar(req.params.id, req.auth.id, { nota, comentario });
  success(res, avaliacao, 'Avaliação atualizada');
});

exports.remover = asyncHandler(async (req, res) => {
  await avaliacaoService.remover(req.params.id, req.auth.id);
  success(res, null, 'Avaliação removida');
});
