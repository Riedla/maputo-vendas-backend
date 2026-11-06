const logger = require('../utils/logger');
const { AppError } = require('../utils/response');

// Códigos de erro MySQL/MariaDB mais comuns
const DB_ERRORS = {
  ER_DUP_ENTRY: { status: 409, message: 'Registo duplicado' },
  ER_NO_REFERENCED_ROW_2: { status: 400, message: 'Referência inválida (registo relacionado não existe)' },
  ER_ROW_IS_REFERENCED_2: { status: 409, message: 'Registo em uso por outros dados' },
  ER_CHECK_CONSTRAINT_VIOLATED: { status: 400, message: 'Valor fora dos limites permitidos' }
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Erro interno do servidor';
  let details;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON inválido no corpo do pedido';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Corpo do pedido demasiado grande';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expirado';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    status = 401;
    message = 'Token inválido';
  } else if (err.code && DB_ERRORS[err.code]) {
    ({ status, message } = DB_ERRORS[err.code]);
  }

  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, method: req.method, url: req.originalUrl });
  } else {
    logger.debug(`${status} ${req.method} ${req.originalUrl}: ${message}`);
  }

  const body = { success: false, message };
  if (details) body.errors = details;
  if (status >= 500 && process.env.NODE_ENV === 'development') {
    body.debug = err.message;
  }
  res.status(status).json(body);
}

module.exports = errorHandler;
