const router = require('express').Router();
const ctrl = require('../controllers/rotaController');
const { authUsuario, authAny } = require('../middleware/auth');
const { validate, rules, body, query } = require('../middleware/validation');
const Rota = require('../models/Rota');

router.post('/', authUsuario, validate([
  body('id_vendedor').isInt({ min: 1 }).withMessage('id_vendedor é obrigatório').toInt(),
  body('id_produto').isInt({ min: 1 }).withMessage('id_produto é obrigatório').toInt(),
  ...rules.latLngBody('latitude_origem', 'longitude_origem'),
  body('modo_transporte').optional().isIn(Rota.MODOS).withMessage(`modo_transporte deve ser: ${Rota.MODOS.join(', ')}`)
]), ctrl.iniciar);

router.get('/', authUsuario, validate([
  ...rules.pagination(),
  query('status').optional().isIn(Rota.STATUS).withMessage(`status deve ser: ${Rota.STATUS.join(', ')}`)
]), ctrl.listar);

// Acessível ao utilizador que criou a rota e ao vendedor de destino
router.get('/:id', authAny, validate([rules.idParam()]), ctrl.obter);

router.patch('/:id/status', authUsuario, validate([
  rules.idParam(),
  body('status').isIn(['em_andamento', 'concluida', 'cancelada'])
    .withMessage('status deve ser: em_andamento, concluida ou cancelada')
]), ctrl.atualizarStatus);

module.exports = router;
