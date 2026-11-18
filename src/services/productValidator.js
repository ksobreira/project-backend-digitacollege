const { isNonEmptyString, isPlainObject } = require("../utils/validators");

const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SHAPES = ["square", "circle"];
const OPTION_TYPES = ["text", "color"];
const URL_RE = /^https?:\/\//i;

function validateColumns(body, { partial }) {
  const errors = [];
  const columns = {};

  ["name", "slug"].forEach((k) => {
    if (body[k] === undefined) {
      if (!partial) errors.push(`${k} é obrigatório`);
    } else if (!isNonEmptyString(body[k]))
      errors.push(`${k} deve ser uma string não vazia`);
    else columns[k] = body[k].trim();
  });
  ["enabled", "use_in_menu"].forEach((k) => {
    if (body[k] === undefined) return;
    if (typeof body[k] !== "boolean") errors.push(`${k} deve ser booleano`);
    else columns[k] = body[k];
  });
  if (body.stock !== undefined) {
    if (!Number.isInteger(body.stock) || body.stock < 0)
      errors.push("stock deve ser um inteiro >= 0");
    else columns.stock = body.stock;
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string")
      errors.push("description deve ser string");
    else columns.description = body.description;
  }
  ["price", "price_with_discount"].forEach((k) => {
    if (body[k] === undefined) {
      if (!partial) errors.push(`${k} é obrigatório`);
    } else if (
      typeof body[k] !== "number" ||
      !Number.isFinite(body[k]) ||
      body[k] < 0
    ) {
      errors.push(`${k} deve ser um número >= 0`);
    } else columns[k] = body[k];
  });
  return { errors, columns };
}

function validateCategoryIds(value, errors) {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.some((n) => !Number.isInteger(n) || n < 1)
  ) {
    errors.push("category_ids deve ser um array de inteiros positivos");
    return undefined;
  }
  return [...new Set(value)];
}

// ---- imagens ----
// Decodifica base64 (aceita também data URI). Retorna { ext, buffer } ou null (e registra o erro).
function decodeImage(img, label, errors, fallbackExt) {
  let { type, content } = img;
  if (typeof content !== "string" || !content) {
    errors.push(`${label}.content é obrigatório (base64)`);
    return null;
  }
  const dataUri = content.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (dataUri) {
    type = type || dataUri[1];
    content = dataUri[2];
  }
  const ext = type ? IMAGE_TYPES[String(type).toLowerCase()] : fallbackExt;
  if (!ext) {
    errors.push(
      `${label}.type inválido (aceitos: ${Object.keys(IMAGE_TYPES).join(", ")})`,
    );
    return null;
  }
  const clean = content.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
    errors.push(`${label}.content deve ser um base64 válido`);
    return null;
  }
  const buffer = Buffer.from(clean, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    errors.push(`${label}.content deve ter entre 1 byte e 5MB`);
    return null;
  }
  return { ext, buffer };
}

// POST: todas as imagens são novas.
function planImagesForCreate(images, errors) {
  if (images === undefined) return [];
  if (!Array.isArray(images)) {
    errors.push("images deve ser um array");
    return [];
  }
  return images
    .map((img, i) =>
      isPlainObject(img)
        ? decodeImage(img, `images[${i}]`, errors)
        : errors.push(`images[${i}] inválido`) && null,
    )
    .filter(Boolean)
    .map((d) => ({ op: "create", ...d }));
}

// PUT: cada item pode criar, remover ou substituir uma imagem existente.
function planImagesForUpdate(images, existing, errors) {
  if (images === undefined) return [];
  if (!Array.isArray(images)) {
    errors.push("images deve ser um array");
    return [];
  }
  const plan = [];
  images.forEach((img, i) => {
    const label = `images[${i}]`;
    if (!isPlainObject(img)) return errors.push(`${label} inválido`);

    if (img.id === undefined) {
      const d = decodeImage(img, label, errors);
      if (d) plan.push({ op: "create", ...d });
      return;
    }
    const current = existing.find((e) => e.id === img.id);
    if (!current)
      return errors.push(`${label}.id ${img.id} não pertence a este produto`);

    if (img.deleted === true)
      return plan.push({ op: "delete", image: current });
    // content com URL = imagem já publicada, nada a fazer
    if (typeof img.content === "string" && !URL_RE.test(img.content)) {
      const ext = current.path.split(".").pop();
      const d = decodeImage(img, label, errors, ext);
      if (d) plan.push({ op: "replace", image: current, ...d });
    }
  });
  return plan;
}

// ---- opções ----
function parseRadius(v) {
  if (Number.isInteger(v) && v >= 0) return v;
  const m = typeof v === "string" && v.trim().match(/^(\d+)(px)?$/i);
  return m ? Number(m[1]) : null;
}

// O escopo usa "value" e "values" de forma inconsistente: aceitamos os dois.
function normalizeOption(o, idx, errors, isNew) {
  const p = `options[${idx}]`;
  const data = {};

  if (isNew || o.title !== undefined) {
    if (!isNonEmptyString(o.title)) errors.push(`${p}.title é obrigatório`);
    else data.title = o.title.trim();
  }
  if (o.shape !== undefined) {
    if (!SHAPES.includes(o.shape))
      errors.push(`${p}.shape deve ser ${SHAPES.join(" ou ")}`);
    else data.shape = o.shape;
  }
  if (o.type !== undefined) {
    if (!OPTION_TYPES.includes(o.type))
      errors.push(`${p}.type deve ser ${OPTION_TYPES.join(" ou ")}`);
    else data.type = o.type;
  }
  if (o.radius !== undefined) {
    const r = parseRadius(o.radius);
    if (r === null) errors.push(`${p}.radius inválido (ex.: 4 ou "4px")`);
    else data.radius = r;
  }
  const raw = o.values !== undefined ? o.values : o.value;
  if (isNew || raw !== undefined) {
    const ok =
      Array.isArray(raw) &&
      raw.length > 0 &&
      raw.every(
        (v) =>
          ["string", "number"].includes(typeof v) &&
          String(v).trim() !== "" &&
          !String(v).includes(","),
      );
    if (!ok)
      errors.push(
        `${p}.values deve ser um array não vazio de textos sem vírgula`,
      );
    else data.optionValues = raw.map((v) => String(v).trim()).join(",");
  }
  return data;
}

function planOptionsForCreate(options, errors) {
  if (options === undefined) return [];
  if (!Array.isArray(options)) {
    errors.push("options deve ser um array");
    return [];
  }
  return options
    .map((o, i) => {
      if (!isPlainObject(o)) {
        errors.push(`options[${i}] inválido`);
        return null;
      }
      return { op: "create", data: normalizeOption(o, i, errors, true) };
    })
    .filter(Boolean);
}

function planOptionsForUpdate(options, existing, errors) {
  if (options === undefined) return [];
  if (!Array.isArray(options)) {
    errors.push("options deve ser um array");
    return [];
  }
  const plan = [];
  options.forEach((o, i) => {
    if (!isPlainObject(o)) return errors.push(`options[${i}] inválido`);
    if (o.id === undefined)
      return plan.push({
        op: "create",
        data: normalizeOption(o, i, errors, true),
      });

    const current = existing.find((e) => e.id === o.id);
    if (!current)
      return errors.push(
        `options[${i}].id ${o.id} não pertence a este produto`,
      );
    if (o.deleted === true) return plan.push({ op: "delete", option: current });
    return plan.push({
      op: "update",
      option: current,
      data: normalizeOption(o, i, errors, false),
    });
  });
  return plan;
}

module.exports = {
  validateColumns,
  validateCategoryIds,
  planImagesForCreate,
  planImagesForUpdate,
  planOptionsForCreate,
  planOptionsForUpdate,
};
