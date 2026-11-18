// Tratamento centralizado de erros: sempre responde JSON { message, errors? }.
const AppError = require("../utils/AppError");

function notFoundHandler(req, res, next) {
  next(
    AppError.notFound(`Rota ${req.method} ${req.originalUrl} não encontrada`),
  );
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({
        message: err.message,
        ...(err.details && { errors: err.details }),
      });
  }
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ message: "JSON inválido no corpo da requisição" });
  }
  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ message: "Corpo da requisição grande demais" });
  }
  if (
    err.name === "SequelizeUniqueConstraintError" ||
    err.name === "SequelizeValidationError"
  ) {
    return res
      .status(400)
      .json({
        message: "Dados inválidos",
        errors: err.errors.map((e) => e.message),
      });
  }
  console.error(err);
  return res.status(500).json({ message: "Erro interno do servidor" });
}

module.exports = { notFoundHandler, errorHandler };
