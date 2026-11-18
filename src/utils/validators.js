// Funções pequenas de validação reutilizadas pelos services.
const AppError = require('./AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Converte o :id da rota; id inválido nunca existe, então responde 404.
function parseId(raw) {
  if (!/^\d+$/.test(String(raw)) || Number(raw) < 1) throw AppError.notFound();
  return Number(raw);
}

// Lança 400 com a lista de mensagens de validação, se houver.
function assertNoErrors(errors, message = 'Dados da requisição inválidos') {
  if (errors.length) throw AppError.badRequest(message, errors);
}

// Lê limit/page da query string (limit=-1 retorna todos os itens).
function parsePagination(query) {
  const errors = [];
  let limit = 12;
  let page = 1;

  if (query.limit !== undefined) {
    if (!/^-?\d+$/.test(String(query.limit)) || (Number(query.limit) < 1 && Number(query.limit) !== -1)) {
      errors.push('limit deve ser um inteiro >= 1 ou -1');
    } else limit = Number(query.limit);
  }
  if (query.page !== undefined) {
    if (!/^\d+$/.test(String(query.page)) || Number(query.page) < 1) errors.push('page deve ser um inteiro >= 1');
    else page = Number(query.page);
  }
  assertNoErrors(errors, 'Parâmetros de paginação inválidos');

  if (limit === -1) page = 1; // com limit=-1 a página não tem efeito
  return { limit, page, offset: limit === -1 ? undefined : (page - 1) * limit };
}

// Lê "fields=a,b,c" validando contra a lista de campos permitidos.
function parseFields(raw, allowed) {
  if (raw === undefined) return null;
  const fields = String(raw).split(',').map((f) => f.trim()).filter(Boolean);
  const invalid = fields.filter((f) => !allowed.includes(f));
  if (!fields.length || invalid.length) {
    throw AppError.badRequest('Parâmetro fields inválido', [
      `Campos permitidos: ${allowed.join(', ')}`,
      ...(invalid.length ? [`Campos desconhecidos: ${invalid.join(', ')}`] : []),
    ]);
  }
  return fields;
}

module.exports = { isNonEmptyString, isEmail, isPlainObject, parseId, assertNoErrors, parsePagination, parseFields };
