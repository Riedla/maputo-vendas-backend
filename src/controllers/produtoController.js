const produtoRepository = require('../repositories/produtoRepository');
const pesquisaRepository = require('../repositories/pesquisaRepository');
const { AppError, success, paginated, asyncHandler } = require('../utils/response');
const { parsePagination } = require('../utils/validators');

exports.listar = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });
  const filtros = { nome: req.query.nome, idCategoria: req.query.categoria };
  const [produtos, total] = await Promise.all([
    produtoRepository.findAll({ ...filtros, limit, offset }),
    produtoRepository.count(filtros)
  ]);
  paginated(res, produtos, { page, limit, total });
});

exports.obter = asyncHandler(async (req, res) => {
  const produto = await produtoRepository.findById(req.params.id);
  if (!produto || !produto.ativo) throw AppError.notFound('Produto não encontrado');
  success(res, produto);
});

exports.categorias = asyncHandler(async (req, res) => {
  success(res, await produtoRepository.findCategorias());
});

exports.maisPesquisados = asyncHandler(async (req, res) => {
  const dias = Math.min(365, Math.max(1, parseInt(req.query.dias, 10) || 30));
  success(res, await pesquisaRepository.maisPesquisados({ dias, limit: 10 }));
});
