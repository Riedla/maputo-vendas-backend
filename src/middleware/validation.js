const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../utils/response');
const { isValidPhoneMZ } = require('../utils/validators');

/**
 * Executa as regras do express-validator e responde 400 com a lista
 * de erros se alguma falhar.
 */
function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const result = validationResult(req);
      if (result.isEmpty()) return next();
      const errors = result.array().map((e) => ({ campo: e.path, mensagem: e.msg }));
      next(AppError.badRequest('Dados inválidos', errors));
    }
  ];
}

// ---------- Regras reutilizáveis ----------

const idParam = (name = 'id') =>
  param(name).isInt({ min: 1 }).withMessage(`${name} deve ser um inteiro positivo`).toInt();

const nome = (optional = false) => {
  const chain = body('nome');
  return (optional ? chain.optional() : chain)
    .isString().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres');
};

const email = () =>
  body('email').isEmail().withMessage('Email inválido').normalizeEmail({ gmail_remove_dots: false });

const senha = (field = 'senha') =>
  body(field)
    .isString()
    .isLength({ min: 6, max: 72 }).withMessage('Senha deve ter entre 6 e 72 caracteres');

/** @param {'required'|'optional'|'nullable'} mode */
const telefone = (mode = 'optional') => {
  const chain = body('telefone');
  const opt = { required: chain, optional: chain.optional(), nullable: chain.optional({ values: 'falsy' }) };
  return opt[mode]
    .custom((v) => isValidPhoneMZ(v)).withMessage('Telefone moçambicano inválido (ex: +258 84 123 4567)');
};

const latLngBody = (latField, lngField, optional = false) => {
  const lat = body(latField);
  const lng = body(lngField);
  return [
    (optional ? lat.optional() : lat)
      .isFloat({ min: -90, max: 90 }).withMessage(`${latField} deve estar entre -90 e 90`).toFloat(),
    (optional ? lng.optional() : lng)
      .isFloat({ min: -180, max: 180 }).withMessage(`${lngField} deve estar entre -180 e 180`).toFloat()
  ];
};

const latLngQuery = (latField = 'lat', lngField = 'lng') => [
  query(latField).isFloat({ min: -90, max: 90 }).withMessage(`${latField} é obrigatório (-90 a 90)`).toFloat(),
  query(lngField).isFloat({ min: -180, max: 180 }).withMessage(`${lngField} é obrigatório (-180 a 180)`).toFloat()
];

const pagination = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('page deve ser >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit deve estar entre 1 e 100').toInt()
];

module.exports = {
  validate,
  rules: { idParam, nome, email, senha, telefone, latLngBody, latLngQuery, pagination },
  body,
  param,
  query
};
