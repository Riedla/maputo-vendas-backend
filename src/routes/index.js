const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Limite mais restrito para login/registo (proteção contra força bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas tentativas de autenticação. Tente novamente mais tarde.' }
});

router.use(['/usuarios/login', '/usuarios/registro', '/vendedores/login', '/vendedores/registro'], authLimiter);

router.use('/usuarios', require('./usuarios'));
router.use('/vendedores', require('./vendedores'));
router.use('/produtos', require('./produtos'));
router.use('/pesquisa', require('./pesquisa'));
router.use('/rotas', require('./rotas'));
router.use('/avaliacoes', require('./avaliacoes'));

module.exports = router;
