const authService = require('../services/authService');
const rotaService = require('../services/rotaService');
const avaliacaoService = require('../services/avaliacaoService');
const vendedorRepository = require('../repositories/vendedorRepository');
const produtoRepository = require('../repositories/produtoRepository');
const { AppError, success, created, paginated, asyncHandler } = require('../utils/response');
const { normalizePhoneMZ, parsePagination } = require('../utils/validators');

// ---------- Autenticação ----------

exports.registrar = asyncHandler(async (req, res) => {
  const { nome, email, telefone, senha, descricao, endereco, latitude, longitude } = req.body;
  const result = await authService.registrarVendedor({
    nome, email, telefone, senha, descricao, endereco, latitude, longitude
  });
  created(res, { token: result.token, tipo: result.tipo, vendedor: result.conta }, 'Vendedor registado com sucesso');
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.loginVendedor(req.body.email, req.body.senha);
  success(res, { token: result.token, tipo: result.tipo, vendedor: result.conta }, 'Login efetuado com sucesso');
});

// ---------- Público ----------

exports.listar = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const nome = req.query.nome;
  const [vendedores, total] = await Promise.all([
    vendedorRepository.findAll({ nome, limit, offset }),
    vendedorRepository.count({ nome })
  ]);
  paginated(res, vendedores, { page, limit, total });
});

async function getVendedorAtivo(id) {
  const vendedor = await vendedorRepository.findById(id);
  if (!vendedor || !vendedor.ativo) throw AppError.notFound('Vendedor não encontrado');
  return vendedor;
}

exports.obter = asyncHandler(async (req, res) => {
  const vendedor = await getVendedorAtivo(req.params.id);
  const produtos = await vendedorRepository.listOfertas(vendedor.id_vendedor, { apenasDisponiveis: true });
  success(res, { ...vendedor.toJSON(), produtos });
});

exports.produtos = asyncHandler(async (req, res) => {
  const vendedor = await getVendedorAtivo(req.params.id);
  success(res, await vendedorRepository.listOfertas(vendedor.id_vendedor, { apenasDisponiveis: true }));
});

exports.avaliacoes = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { avaliacoes, total, resumo } = await avaliacaoService.listarPorVendedor(req.params.id, { limit, offset });
  res.json({
    success: true,
    message: 'OK',
    resumo,
    data: avaliacoes,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 }
  });
});

// ---------- Conta do vendedor autenticado ----------

exports.perfil = asyncHandler(async (req, res) => {
  success(res, req.conta);
});

exports.atualizarPerfil = asyncHandler(async (req, res) => {
  const { nome, telefone, descricao, endereco } = req.body;
  const dados = { nome, descricao, endereco };
  if (telefone !== undefined) dados.telefone = normalizePhoneMZ(telefone);
  success(res, await vendedorRepository.update(req.auth.id, dados), 'Perfil atualizado');
});

exports.atualizarLocalizacao = asyncHandler(async (req, res) => {
  const { latitude, longitude, endereco } = req.body;
  const vendedor = await vendedorRepository.updateLocalizacao(req.auth.id, { latitude, longitude, endereco });
  success(res, vendedor, 'Localização atualizada');
});

exports.alterarSenha = asyncHandler(async (req, res) => {
  await authService.alterarSenha('vendedor', req.auth.id, req.body.senha_atual, req.body.nova_senha);
  success(res, null, 'Senha alterada com sucesso');
});

exports.desativarConta = asyncHandler(async (req, res) => {
  await vendedorRepository.deactivate(req.auth.id);
  success(res, null, 'Conta desativada');
});

exports.meusProdutos = asyncHandler(async (req, res) => {
  success(res, await vendedorRepository.listOfertas(req.auth.id));
});

exports.adicionarProduto = asyncHandler(async (req, res) => {
  const { id_produto, preco, quantidade_disponivel, disponivel } = req.body;
  const produto = await produtoRepository.findById(id_produto);
  if (!produto || !produto.ativo) throw AppError.notFound('Produto não encontrado');
  if (await vendedorRepository.findOferta(req.auth.id, id_produto)) {
    throw AppError.conflict('Este produto já está na sua lista; use PUT para atualizar');
  }
  const oferta = await vendedorRepository.createOferta(req.auth.id, {
    id_produto, preco, quantidade_disponivel, disponivel
  });
  created(res, oferta, 'Produto adicionado');
});

exports.atualizarProduto = asyncHandler(async (req, res) => {
  const idProduto = req.params.idProduto;
  if (!(await vendedorRepository.findOferta(req.auth.id, idProduto))) {
    throw AppError.notFound('Produto não encontrado na sua lista');
  }
  const { preco, quantidade_disponivel, disponivel } = req.body;
  const oferta = await vendedorRepository.updateOferta(req.auth.id, idProduto, {
    preco, quantidade_disponivel, disponivel
  });
  success(res, oferta, 'Produto atualizado');
});

exports.removerProduto = asyncHandler(async (req, res) => {
  const removido = await vendedorRepository.deleteOferta(req.auth.id, req.params.idProduto);
  if (!removido) throw AppError.notFound('Produto não encontrado na sua lista');
  success(res, null, 'Produto removido');
});

exports.rotasRecebidas = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { rotas, total } = await rotaService.listarRotasVendedor(req.auth.id, {
    status: req.query.status, limit, offset
  });
  paginated(res, rotas, { page, limit, total });
});
