const router = require('express').Router();
const ctrl = require('../controllers/produtoController');
const { validate, rules, query } = require('../middleware/validation');

router.get('/', validate([
  ...rules.pagination(),
  query('nome').optional().isString().trim(),
  query('categoria').optional().isInt({ min: 1 }).withMessage('categoria deve ser um id válido').toInt()
]), ctrl.listar);
router.get('/categorias', ctrl.categorias);
router.get('/mais-pesquisados', validate([query('dias').optional().isInt({ min: 1, max: 365 }).toInt()]), ctrl.maisPesquisados);
router.get('/:id', validate([rules.idParam()]), ctrl.obter);

module.exports = router;
