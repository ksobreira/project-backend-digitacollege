const productService = require('../services/productService');

function extractOptionFilters(req) {
  const raw = req.originalUrl.split('?')[1] || '';
  const filters = {};
  for (const [key, value] of new URLSearchParams(raw)) {
    const m = key.match(/^option\[(.*)\]$/);
    if (m) filters[m[1]] = value;
  }
  return filters;
}

exports.search = async (req, res) => {
  const result = await productService.search({ ...req.query, optionFilters: extractOptionFilters(req) });
  res.status(200).json(result);
};

exports.show = async (req, res) => res.status(200).json(await productService.getById(req.params.id));

exports.create = async (req, res) => res.status(201).json(await productService.create(req.body));

exports.update = async (req, res) => {
  await productService.update(req.params.id, req.body);
  res.status(204).send();
};

exports.remove = async (req, res) => {
  await productService.remove(req.params.id);
  res.status(204).send();
};