const router = require('express').Router();
const ctrl = require('../controllers/usuarioController');
const { authUsuario } = require('../middleware/auth');
const { validate, rules, body } = require('../middleware/validation');

router.post('/registro', validate([rules.nome(), rules.email(), rules.senha(), rules.telefone('nullable')]), ctrl.registrar);
router.post('/login', validate([rules.email(), body('senha').isString().notEmpty().withMessage('Senha é obrigatória')]), ctrl.login);

router.use(authUsuario);

router.get('/me', ctrl.perfil);
router.put('/me', validate([rules.nome(true), rules.telefone('nullable')]), ctrl.atualizarPerfil);
router.put('/me/senha', validate([
  body('senha_atual').isString().notEmpty().withMessage('senha_atual é obrigatória'),
  rules.senha('nova_senha')
]), ctrl.alterarSenha);
router.delete('/me', ctrl.desativarConta);

router.get('/me/pesquisas', validate(rules.pagination()), ctrl.historicoPesquisas);
router.delete('/me/pesquisas', ctrl.limparPesquisas);
router.get('/me/avaliacoes', validate(rules.pagination()), ctrl.minhasAvaliacoes);

module.exports = router;
