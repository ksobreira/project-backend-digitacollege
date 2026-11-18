
const { Category } = require("../models");
const AppError = require("../utils/AppError");
const {
  isNonEmptyString,
  isPlainObject,
  parseId,
  assertNoErrors,
  parsePagination,
  parseFields,
} = require("../utils/validators");

const FIELDS = ["id", "name", "slug", "use_in_menu"];

async function search(query) {
  const { limit, page, offset } = parsePagination(query);
  const fields = parseFields(query.fields, FIELDS);

  const where = {};
  if (query.use_in_menu !== undefined) {
    if (!["true", "false"].includes(String(query.use_in_menu))) {
      throw AppError.badRequest("use_in_menu deve ser true ou false");
    }
    where.use_in_menu = String(query.use_in_menu) === "true";
  }

  const { rows, count } = await Category.findAndCountAll({
    where,
    attributes: fields || FIELDS,
    order: [["id", "ASC"]],
    ...(limit !== -1 && { limit, offset }),
  });

  return {
    data: rows.map((r) => r.get({ plain: true })),
    total: count,
    limit,
    page,
  };
}

async function getById(rawId) {
  const category = await Category.findByPk(parseId(rawId), {
    attributes: FIELDS,
  });
  if (!category) throw AppError.notFound("Categoria não encontrada");
  return category.get({ plain: true });
}

// Valida o payload; em "partial" (PUT) os campos são opcionais, mas se vierem precisam ser válidos.
function validate(body, { partial }) {
  const errors = [];
  const data = {};
  if (!isPlainObject(body))
    throw AppError.badRequest("Corpo da requisição inválido");

  ["name", "slug"].forEach((k) => {
    if (body[k] === undefined) {
      if (!partial) errors.push(`${k} é obrigatório`);
    } else if (!isNonEmptyString(body[k]))
      errors.push(`${k} deve ser uma string não vazia`);
    else data[k] = body[k].trim();
  });
  if (body.use_in_menu !== undefined) {
    if (typeof body.use_in_menu !== "boolean")
      errors.push("use_in_menu deve ser booleano");
    else data.use_in_menu = body.use_in_menu;
  }
  if (partial && !Object.keys(data).length && !errors.length)
    errors.push("Informe ao menos um campo para atualizar");
  assertNoErrors(errors);
  return data;
}

async function create(body) {
  const category = await Category.create(validate(body, { partial: false }));
  return getById(category.id);
}

async function update(rawId, body) {
  const category = await Category.findByPk(parseId(rawId));
  if (!category) throw AppError.notFound("Categoria não encontrada");
  await category.update(validate(body, { partial: true }));
}

async function remove(rawId) {
  const category = await Category.findByPk(parseId(rawId));
  if (!category) throw AppError.notFound("Categoria não encontrada");
  await category.destroy(); // vínculos em product_categories caem por ON DELETE CASCADE
}

module.exports = { search, getById, create, update, remove };
