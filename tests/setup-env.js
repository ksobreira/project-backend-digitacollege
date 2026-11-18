// Roda antes dos testes: isola variáveis de ambiente (SQLite em memória + uploads em pasta temporária).
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.AUTH_MISSING_TOKEN_STATUS = '401';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'projeto-backend-test-uploads');
