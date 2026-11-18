// Erro de aplicação com status HTTP; é convertido em resposta JSON pelo errorHandler.
class AppError extends Error {
  constructor(message, status = 500, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(message, 400, details);
  }
  static unauthorized(message = 'Não autorizado') {
    return new AppError(message, 401);
  }
  static notFound(message = 'Recurso não encontrado') {
    return new AppError(message, 404);
  }
}

module.exports = AppError;
