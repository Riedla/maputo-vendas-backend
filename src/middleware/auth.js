const authService = require('../services/authService');
const usuarioRepository = require('../repositories/usuarioRepository');
const vendedorRepository = require('../repositories/vendedorRepository');
const { AppError } = require('../utils/response');

function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function loadAccount(payload) {
  const repo = payload.tipo === 'vendedor' ? vendedorRepository : usuarioRepository;
  const conta = await repo.findById(payload.sub);
  if (!conta || !conta.ativo) {
    throw AppError.unauthorized('Conta inexistente ou desativada');
  }
  return conta;
}

/**
 * Exige um token JWT válido. Define req.auth = { id, tipo } e req.conta.
 * @param {...('usuario'|'vendedor')} tipos tipos de conta permitidos (todos se vazio)
 */
function authenticate(...tipos) {
  return async (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) throw AppError.unauthorized('Token de autenticação em falta');

      const payload = authService.verifyToken(token);
      if (tipos.length && !tipos.includes(payload.tipo)) {
        throw AppError.forbidden(`Apenas contas do tipo "${tipos.join('" ou "')}" podem aceder a este recurso`);
      }

      req.conta = await loadAccount(payload);
      req.auth = { id: payload.sub, tipo: payload.tipo };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Autenticação opcional: se houver token válido, preenche req.auth; caso contrário segue. */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = authService.verifyToken(token);
    req.auth = { id: payload.sub, tipo: payload.tipo };
  } catch (_) {
    // token inválido numa rota pública: ignora
  }
  next();
}

module.exports = {
  authenticate,
  authUsuario: authenticate('usuario'),
  authVendedor: authenticate('vendedor'),
  authAny: authenticate(),
  optionalAuth
};
