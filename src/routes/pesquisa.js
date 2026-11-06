const router = require('express').Router();
const ctrl = require('../controllers/pesquisaController');
const { optionalAuth } = require('../middleware/auth');
const { validate, rules, query } = require('../middleware/validation');
const { RAIO_MAXIMO_KM } = require('../services/buscarVendedoresService');

const raio = query('raio').optional()
  .isFloat({ gt: 0, max: RAIO_MAXIMO_KM }).withMessage(`raio deve estar entre 0 e ${RAIO_MAXIMO_KM} km`).toFloat();

/**
 * GET /api/pesquisa/vendedores?lat=&lng=&produto=&termo=&categoria=&raio=&preco_min=&preco_max=&ordenar=
 * Pública; se o utilizador estiver autenticado a pesquisa fica no histórico.
 */
router.get('/vendedores', optionalAuth, validate([
  ...rules.latLngQuery(),
  raio,
  ...rules.pagination(),
  query('produto').optional().isInt({ min: 1 }).withMessage('produto deve ser um id válido').toInt(),
  query('categoria').optional().isInt({ min: 1 }).withMessage('categoria deve ser um id válido').toInt(),
  query('termo').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('termo deve ter 2 a 100 caracteres'),
  query('preco_min').optional().isFloat({ min: 0 }).withMessage('preco_min deve ser >= 0').toFloat(),
  query('preco_max').optional().isFloat({ min: 0 }).withMessage('preco_max deve ser >= 0').toFloat(),
  query('ordenar').optional().isIn(['distancia', 'preco', 'avaliacao']).withMessage('ordenar deve ser distancia, preco ou avaliacao')
]), ctrl.buscar);

/** GET /api/pesquisa/proximos?lat=&lng=&raio= */
router.get('/proximos', validate([...rules.latLngQuery(), raio, ...rules.pagination()]), ctrl.proximos);

module.exports = router;
