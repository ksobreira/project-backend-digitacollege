const { Op } = require("sequelize");
const {
  sequelize,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
  Category,
} = require("../models");
const AppError = require("../utils/AppError");
const {
  isPlainObject,
  parseId,
  assertNoErrors,
  parsePagination,
  parseFields,
} = require("../utils/validators");
const storage = require("./imageStorage");
const v = require("./productValidator");

const COLUMNS = [
  "id",
  "enabled",
  "name",
  "slug",
  "use_in_menu",
  "stock",
  "description",
  "price",
  "price_with_discount",
];
const RELATIONS = ["category_ids", "images", "options"];
const ALL_FIELDS = [...COLUMNS, ...RELATIONS];

function serialize(product, fields) {
  const wants = (f) => !fields || fields.includes(f);
  const out = {};
  COLUMNS.forEach((c) => {
    if (wants(c)) out[c] = product.get(c);
  });
  if (wants("category_ids"))
    out.category_ids = (product.categories || [])
      .map((c) => c.id)
      .sort((a, b) => a - b);
  if (wants("images")) {
    out.images = (product.images || [])
      .filter((i) => i.enabled)
      .map((i) => ({ id: i.id, content: storage.toUrl(i.path) }));
  }
  if (wants("options")) {
    out.options = (product.options || []).map((o) => ({
      id: o.id,
      title: o.title,
      shape: o.shape,
      radius: o.radius,
      type: o.type,
      values: o.optionValues.split(","),
    }));
  }
  return out;
}

function buildInclude(fields) {
  const wants = (f) => !fields || fields.includes(f);
  const include = [];
  const order = [["id", "ASC"]];
  if (wants("category_ids")) {
    include.push({
      model: Category,
      as: "categories",
      attributes: ["id"],
      through: { attributes: [] },
    });
  }
  if (wants("images")) {
    include.push({ model: ProductImage, as: "images" });
    order.push([{ model: ProductImage, as: "images" }, "id", "ASC"]);
  }
  if (wants("options")) {
    include.push({ model: ProductOption, as: "options" });
    order.push([{ model: ProductOption, as: "options" }, "id", "ASC"]);
  }
  return { include, order };
}

async function findOrFail(rawId, fields = null) {
  const id = parseId(rawId);
  const { include, order } = buildInclude(fields);
  const product = await Product.findByPk(id, {
    attributes: fields
      ? ["id", ...fields.filter((f) => COLUMNS.includes(f))]
      : undefined,
    include,
    order,
  });
  if (!product) throw AppError.notFound("Produto não encontrado");
  return product;
}

const getById = async (rawId) => serialize(await findOrFail(rawId));

const intersect = (sets) =>
  sets.reduce((acc, s) => acc.filter((id) => s.includes(id)));

async function search(query) {
  const { limit, page, offset } = parsePagination(query);
  const fields = parseFields(query.fields, ALL_FIELDS);
  const where = {};
  const idSets = [];

  if (query.match !== undefined) {
    const term = String(query.match).trim();
    if (!term) throw AppError.badRequest("match não pode ser vazio");
    where[Op.or] = [
      { name: { [Op.like]: `%${term}%` } },
      { description: { [Op.like]: `%${term}%` } },
    ];
  }

  // price-range=100-200
  if (query["price-range"] !== undefined) {
    const m = String(query["price-range"]).match(
      /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/,
    );
    if (!m || Number(m[1]) > Number(m[2]))
      throw AppError.badRequest("price-range inválido (ex.: 100-200)");
    where.price = { [Op.between]: [Number(m[1]), Number(m[2])] };
  }

  if (query.category_ids !== undefined) {
    const ids = String(query.category_ids)
      .split(",")
      .map((s) => s.trim());
    if (!ids.length || ids.some((s) => !/^\d+$/.test(s)))
      throw AppError.badRequest("category_ids inválido");
    const rows = await ProductCategory.findAll({
      where: { category_id: ids.map(Number) },
      attributes: ["product_id"],
    });
    idSets.push([...new Set(rows.map((r) => r.product_id))]);
  }

  const optionFilters = query.optionFilters || {};
  if (query.option !== undefined && !Object.keys(optionFilters).length) {
    throw AppError.badRequest("option inválido (ex.: option[45]=GG,PP)");
  }
  for (const [optionId, raw] of Object.entries(optionFilters)) {
    const wanted = String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!/^\d+$/.test(optionId) || !wanted.length)
      throw AppError.badRequest("option inválido (ex.: option[45]=GG,PP)");

    const likes = wanted
      .flatMap((w) => [w, `${w},%`, `%,${w}`, `%,${w},%`])
      .map((pat) => ({ optionValues: { [Op.like]: pat } }));
    const rows = await ProductOption.findAll({
      where: { id: Number(optionId), [Op.or]: likes },
      attributes: ["product_id"],
    });
    idSets.push([...new Set(rows.map((r) => r.product_id))]);
  }

  if (idSets.length) {
    const ids = intersect(idSets);
    if (!ids.length) return { data: [], total: 0, limit, page };
    where.id = { [Op.in]: ids };
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    attributes: ["id"],
    order: [["id", "ASC"]],
    ...(limit !== -1 && { limit, offset }),
  });
  if (!rows.length) return { data: [], total: count, limit, page };

  const { include, order } = buildInclude(fields);
  const products = await Product.findAll({
    where: { id: rows.map((r) => r.id) },
    attributes: fields
      ? ["id", ...fields.filter((f) => COLUMNS.includes(f))]
      : undefined,
    include,
    order,
  });
  return {
    data: products.map((p) => serialize(p, fields)),
    total: count,
    limit,
    page,
  };
}

async function assertCategoriesExist(ids) {
  if (!ids || !ids.length) return;
  const found = await Category.count({ where: { id: ids } });
  if (found !== ids.length)
    throw AppError.badRequest(
      "Uma ou mais categorias em category_ids não existem",
    );
}

async function setCategories(productId, ids, transaction) {
  await ProductCategory.destroy({
    where: { product_id: productId },
    transaction,
  });
  if (ids.length) {
    await ProductCategory.bulkCreate(
      ids.map((category_id) => ({ product_id: productId, category_id })),
      { transaction },
    );
  }
}

async function create(body) {
  if (!isPlainObject(body))
    throw AppError.badRequest("Corpo da requisição inválido");

  const { errors, columns } = v.validateColumns(body, { partial: false });
  const categoryIds = v.validateCategoryIds(body.category_ids, errors) || [];
  const imagePlan = v.planImagesForCreate(body.images, errors);
  const optionPlan = v.planOptionsForCreate(body.options, errors);
  if (columns.price_with_discount > columns.price)
    errors.push("price_with_discount não pode ser maior que price");
  assertNoErrors(errors);
  await assertCategoriesExist(categoryIds);

  const written = [];
  try {
    const id = await sequelize.transaction(async (transaction) => {
      const product = await Product.create(columns, { transaction });
      await setCategories(product.id, categoryIds, transaction);
      for (const img of imagePlan) {
        const path = await storage.save(img.buffer, img.ext);
        written.push(path);
        await ProductImage.create(
          { product_id: product.id, path, enabled: true },
          { transaction },
        );
      }
      if (optionPlan.length) {
        await ProductOption.bulkCreate(
          optionPlan.map((o) => ({ ...o.data, product_id: product.id })),
          { transaction },
        );
      }
      return product.id;
    });
    return await getById(id);
  } catch (err) {
    await Promise.all(written.map((p) => storage.remove(p)));
    throw err;
  }
}

async function update(rawId, body) {
  const product = await findOrFail(rawId);
  if (!isPlainObject(body))
    throw AppError.badRequest("Corpo da requisição inválido");

  const { errors, columns } = v.validateColumns(body, { partial: true });
  const categoryIds = v.validateCategoryIds(body.category_ids, errors);
  const imagePlan = v.planImagesForUpdate(body.images, product.images, errors);
  const optionPlan = v.planOptionsForUpdate(
    body.options,
    product.options,
    errors,
  );

  const price = columns.price ?? product.price;
  const discount = columns.price_with_discount ?? product.price_with_discount;
  if (discount > price)
    errors.push("price_with_discount não pode ser maior que price");
  assertNoErrors(errors);
  await assertCategoriesExist(categoryIds);

  const written = [];
  const toDelete = []; 
  try {
    await sequelize.transaction(async (transaction) => {
      if (Object.keys(columns).length)
        await product.update(columns, { transaction });
      if (categoryIds !== undefined)
        await setCategories(product.id, categoryIds, transaction);

      for (const step of imagePlan) {
        if (step.op === "create") {
          const path = await storage.save(step.buffer, step.ext);
          written.push(path);
          await ProductImage.create(
            { product_id: product.id, path, enabled: true },
            { transaction },
          );
        } else if (step.op === "delete") {
          toDelete.push(step.image.path);
          await step.image.destroy({ transaction });
        } else if (step.op === "replace") {
          const path = await storage.save(step.buffer, step.ext);
          written.push(path);
          toDelete.push(step.image.path);
          await step.image.update({ path }, { transaction });
        }
      }

      for (const step of optionPlan) {
        if (step.op === "create")
          await ProductOption.create(
            { ...step.data, product_id: product.id },
            { transaction },
          );
        else if (step.op === "delete")
          await step.option.destroy({ transaction });
        else if (Object.keys(step.data).length)
          await step.option.update(step.data, { transaction });
      }
    });
  } catch (err) {
    await Promise.all(written.map((p) => storage.remove(p)));
    throw err;
  }
  await Promise.all(toDelete.map((p) => storage.remove(p)));
}

async function remove(rawId) {
  const product = await findOrFail(rawId, ["images"]);
  const paths = product.images.map((i) => i.path);
  await product.destroy();
  await Promise.all(paths.map((p) => storage.remove(p)));
}

module.exports = { search, getById, create, update, remove };
