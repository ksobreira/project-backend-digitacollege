const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

// PNG 1x1 válido em base64
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const resetDb = () => sequelize.sync({ force: true });
const closeDb = () => sequelize.close();

// Cria um usuário e devolve { user, auth } com o header Authorization pronto
async function login() {
  const payload = { firstname: 'Ana', surname: 'Lima', email: 'ana@mail.com', password: '123@123', confirmPassword: '123@123' };
  const created = await request(app).post('/v1/user').send(payload);
  const { body } = await request(app).post('/v1/user/token').send({ email: payload.email, password: payload.password });
  return { user: created.body, auth: { Authorization: `Bearer ${body.token}` } };
}

module.exports = { request, app, PNG, resetDb, closeDb, login };
