const jwt = require("jsonwebtoken");
const config = require("../config");
const AppError = require("../utils/AppError");

module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header)
    throw new AppError(
      "Token de autorização não informado",
      config.missingTokenStatus,
    );

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token)
    throw AppError.unauthorized("Formato do token inválido (use Bearer <jwt>)");

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: Number(payload.sub), email: payload.email };
    next();
  } catch (err) {
    throw AppError.unauthorized("Token inválido ou expirado");
  }
};
