const router = require('express').Router();
const ctrl = require('../controllers/avaliacaoController');
const { authUsuario } = require('../middleware/auth');
const { validate, rules, body } = require('../middleware/validation');

const nota = (optional) => {
  const chain = body('nota');
  return (optional ? chain.optional() : chain)
    .isInt({ min: 1, max: 5 }).withMessage('nota deve ser um inteiro de 1 a 5').toInt();
};
const comentario = body('comentario').optional({ values: 'null' })
  .isString().trim().isLength({ max: 1000 }).withMessage('comentario deve ter no máximo 1000 caracteres');

// A listagem pública está em GET /api/vendedores/:id/avaliacoes
router.use(authUsuario);

router.post('/', validate([
  body('id_vendedor').isInt({ min: 1 }).withMessage('id_vendedor é obrigatório').toInt(),
  body('id_rota').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('id_rota inválido').toInt(),
  nota(false),
  comentario
]), ctrl.criar);

router.put('/:id', validate([rules.idParam(), nota(true), comentario]), ctrl.atualizar);
router.delete('/:id', validate([rules.idParam()]), ctrl.remover);

module.exports = router;
