const authService = require('../services/authService');
const avaliacaoService = require('../services/avaliacaoService');
const usuarioRepository = require('../repositories/usuarioRepository');
const pesquisaRepository = require('../repositories/pesquisaRepository');
const { success, created, paginated, asyncHandler } = require('../utils/response');
const { normalizePhoneMZ, parsePagination } = require('../utils/validators');

exports.registrar = asyncHandler(async (req, res) => {
  const { nome, email, telefone, senha } = req.body;
  const result = await authService.registrarUsuario({ nome, email, telefone, senha });
  created(res, { token: result.token, tipo: result.tipo, usuario: result.conta }, 'Utilizador registado com sucesso');
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.loginUsuario(req.body.email, req.body.senha);
  success(res, { token: result.token, tipo: result.tipo, usuario: result.conta }, 'Login efetuado com sucesso');
});

exports.perfil = asyncHandler(async (req, res) => {
  success(res, req.conta);
});

exports.atualizarPerfil = asyncHandler(async (req, res) => {
  const { nome, telefone } = req.body;
  const dados = { nome };
  if (telefone !== undefined) dados.telefone = telefone ? normalizePhoneMZ(telefone) : null;
  const usuario = await usuarioRepository.update(req.auth.id, dados);
  success(res, usuario, 'Perfil atualizado');
});

exports.alterarSenha = asyncHandler(async (req, res) => {
  await authService.alterarSenha('usuario', req.auth.id, req.body.senha_atual, req.body.nova_senha);
  success(res, null, 'Senha alterada com sucesso');
});

exports.desativarConta = asyncHandler(async (req, res) => {
  await usuarioRepository.deactivate(req.auth.id);
  success(res, null, 'Conta desativada');
});

exports.historicoPesquisas = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const [pesquisas, total] = await Promise.all([
    pesquisaRepository.findByUsuario(req.auth.id, { limit, offset }),
    pesquisaRepository.countByUsuario(req.auth.id)
  ]);
  paginated(res, pesquisas, { page, limit, total });
});

exports.limparPesquisas = asyncHandler(async (req, res) => {
  const removidas = await pesquisaRepository.deleteByUsuario(req.auth.id);
  success(res, { removidas }, 'Histórico de pesquisas apagado');
});

exports.minhasAvaliacoes = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { avaliacoes, total } = await avaliacaoService.listarPorUsuario(req.auth.id, { limit, offset });
  paginated(res, avaliacoes, { page, limit, total });
});
