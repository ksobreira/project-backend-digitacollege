
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

async function save(buffer, ext) {
  const relPath = `products/${crypto.randomUUID()}.${ext}`; // nome gerado: sem path traversal
  const abs = path.join(config.uploadDir, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
  return relPath;
}

async function remove(relPath) {
  try {
    await fs.unlink(path.join(config.uploadDir, relPath));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

const toUrl = (relPath) => `${config.baseUrl}/media/${relPath}`;

module.exports = { save, remove, toUrl };
