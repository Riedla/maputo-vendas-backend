/**
 * Erro de aplicação com código HTTP. Lançado pelos serviços e tratado
 * pelo middleware errorHandler.
 */
class AppError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(msg, details) { return new AppError(msg, 400, details); }
  static unauthorized(msg = 'Não autenticado') { return new AppError(msg, 401); }
  static forbidden(msg = 'Acesso negado') { return new AppError(msg, 403); }
  static notFound(msg = 'Recurso não encontrado') { return new AppError(msg, 404); }
  static conflict(msg) { return new AppError(msg, 409); }
}

function success(res, data = null, message = 'OK', statusCode = 200) {
  const body = { success: true, message };
  if (data !== null && data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

function created(res, data, message = 'Criado com sucesso') {
  return success(res, data, message, 201);
}

function paginated(res, items, { page, limit, total }, message = 'OK') {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0
    }
  });
}

function error(res, message, statusCode = 400, details) {
  const body = { success: false, message };
  if (details) body.errors = details;
  return res.status(statusCode).json(body);
}

/** Envolve um handler async para encaminhar erros para o errorHandler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { AppError, success, created, paginated, error, asyncHandler };
