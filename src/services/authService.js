const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuarioRepository');
const vendedorRepository = require('../repositories/vendedorRepository');
const { AppError } = require('../utils/response');
const { normalizePhoneMZ } = require('../utils/validators');

const SALT_ROUNDS = 10;
// Hash usado quando o email não existe, para que o tempo de resposta não revele contas existentes
const DUMMY_HASH = bcrypt.hashSync('senha-inexistente', SALT_ROUNDS);

const REPOS = { usuario: usuarioRepository, vendedor: vendedorRepository };

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não está definido no ambiente');
  return secret;
}

function hashPassword(senha) {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

function comparePassword(senha, hash) {
  return bcrypt.compare(senha, hash || DUMMY_HASH);
}

function generateToken(id, tipo) {
  return jwt.sign({ tipo }, getSecret(), {
    subject: String(id),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

/** Valida o token e devolve { sub: number, tipo }. Lança erros do jsonwebtoken se inválido. */
function verifyToken(token) {
  const payload = jwt.verify(token, getSecret());
  if (!['usuario', 'vendedor'].includes(payload.tipo)) {
    throw new jwt.JsonWebTokenError('tipo de conta inválido');
  }
  return { sub: parseInt(payload.sub, 10), tipo: payload.tipo };
}

async function emailEmUso(email) {
  const [u, v] = await Promise.all([usuarioRepository.findByEmail(email), vendedorRepository.findByEmail(email)]);
  return Boolean(u || v);
}

async function registrar(tipo, dados) {
  if (await emailEmUso(dados.email)) {
    throw AppError.conflict('Email já registado');
  }
  const senha_hash = await hashPassword(dados.senha);
  const { senha, ...resto } = dados;
  resto.telefone = resto.telefone ? normalizePhoneMZ(resto.telefone) : null;

  const conta = await REPOS[tipo].create({ ...resto, senha_hash });
  const idField = tipo === 'vendedor' ? 'id_vendedor' : 'id_usuario';
  return { token: generateToken(conta[idField], tipo), tipo, conta };
}

async function login(tipo, email, senha) {
  const conta = await REPOS[tipo].findByEmail(email);
  const ok = await comparePassword(senha, conta?.senha_hash);
  if (!conta || !ok) {
    throw AppError.unauthorized('Email ou senha incorretos');
  }
  if (!conta.ativo) {
    throw AppError.forbidden('Conta desativada');
  }
  const idField = tipo === 'vendedor' ? 'id_vendedor' : 'id_usuario';
  return { token: generateToken(conta[idField], tipo), tipo, conta };
}

async function alterarSenha(tipo, id, senhaAtual, novaSenha) {
  const repo = REPOS[tipo];
  const conta = await repo.findByIdWithHash(id);
  if (!conta || !(await comparePassword(senhaAtual, conta.senha_hash))) {
    throw AppError.unauthorized('Senha atual incorreta');
  }
  await repo.update(id, { senha_hash: await hashPassword(novaSenha) });
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  registrarUsuario: (dados) => registrar('usuario', dados),
  registrarVendedor: (dados) => registrar('vendedor', dados),
  loginUsuario: (email, senha) => login('usuario', email, senha),
  loginVendedor: (email, senha) => login('vendedor', email, senha),
  alterarSenha
};
