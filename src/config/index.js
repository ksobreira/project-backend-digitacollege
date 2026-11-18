require('dotenv').config();
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT) || 3000;

if (env === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório em produção');
}

module.exports = {
  env,
  port,
  baseUrl: (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads')),
  // Status devolvido quando o header Authorization não é enviado (ver README)
  missingTokenStatus: Number(process.env.AUTH_MISSING_TOKEN_STATUS) === 400 ? 400 : 401,
  bcryptRounds: 10,
};