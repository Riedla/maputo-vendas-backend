const router = require('express').Router();
const ctrl = require('../controllers/vendedorController');
const { authVendedor } = require('../middleware/auth');
const { validate, rules, body, query } = require('../middleware/validation');
const Rota = require('../models/Rota');

const texto = (field, max) =>
  body(field).optional({ values: 'null' }).isString().trim()
    .isLength({ max }).withMessage(`${field} deve ter no máximo ${max} caracteres`);

const precoRule = (optional) => {
  const chain = body('preco');
  return (optional ? chain.optional() : chain)
    .isFloat({ gt: 0, max: 99999999 }).withMessage('preco deve ser um número positivo').toFloat();
};
const ofertaRules = (optional) => [
  precoRule(optional),
  body('quantidade_disponivel').optional({ values: 'null' })
    .isFloat({ min: 0 }).withMessage('quantidade_disponivel deve ser >= 0').toFloat(),
  body('disponivel').optional().isBoolean().withMessage('disponivel deve ser true/false').toBoolean()
];

// ---------- Autenticação ----------
router.post('/registro', validate([
  rules.nome(), rules.email(), rules.senha(), rules.telefone('required'),
  texto('descricao', 500), texto('endereco', 255),
  ...rules.latLngBody('latitude', 'longitude', true),
  body('longitude').if(body('latitude').exists()).exists().withMessage('longitude é obrigatória com latitude'),
  body('latitude').if(body('longitude').exists()).exists().withMessage('latitude é obrigatória com longitude')
]), ctrl.registrar);
router.post('/login', validate([rules.email(), body('senha').isString().notEmpty().withMessage('Senha é obrigatória')]), ctrl.login);

// ---------- Conta do vendedor autenticado (antes de /:id) ----------
const me = require('express').Router();
me.use(authVendedor);
me.get('/', ctrl.perfil);
me.put('/', validate([rules.nome(true), rules.telefone('optional'), texto('descricao', 500), texto('endereco', 255)]), ctrl.atualizarPerfil);
me.put('/localizacao', validate([...rules.latLngBody('latitude', 'longitude'), texto('endereco', 255)]), ctrl.atualizarLocalizacao);
me.put('/senha', validate([
  body('senha_atual').isString().notEmpty().withMessage('senha_atual é obrigatória'),
  rules.senha('nova_senha')
]), ctrl.alterarSenha);
me.delete('/', ctrl.desativarConta);

me.get('/produtos', ctrl.meusProdutos);
me.post('/produtos', validate([
  body('id_produto').isInt({ min: 1 }).withMessage('id_produto é obrigatório').toInt(),
  ...ofertaRules(false)
]), ctrl.adicionarProduto);
me.put('/produtos/:idProduto', validate([rules.idParam('idProduto'), ...ofertaRules(true)]), ctrl.atualizarProduto);
me.delete('/produtos/:idProduto', validate([rules.idParam('idProduto')]), ctrl.removerProduto);

me.get('/rotas', validate([
  ...rules.pagination(),
  query('status').optional().isIn(Rota.STATUS).withMessage(`status deve ser: ${Rota.STATUS.join(', ')}`)
]), ctrl.rotasRecebidas);

router.use('/me', me);

// ---------- Público ----------
router.get('/', validate([...rules.pagination(), query('nome').optional().isString().trim()]), ctrl.listar);
router.get('/:id', validate([rules.idParam()]), ctrl.obter);
router.get('/:id/produtos', validate([rules.idParam()]), ctrl.produtos);
router.get('/:id/avaliacoes', validate([rules.idParam(), ...rules.pagination()]), ctrl.avaliacoes);

module.exports = router;
