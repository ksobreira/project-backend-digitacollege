// Regras de negócio de usuários e geração do token JWT.
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { User } = require("../models");
const AppError = require("../utils/AppError");
const {
  isNonEmptyString,
  isEmail,
  isPlainObject,
  parseId,
  assertNoErrors,
} = require("../utils/validators");

const serialize = (u) => ({
  id: u.id,
  firstname: u.firstname,
  surname: u.surname,
  email: u.email,
});

async function getById(rawId) {
  const user = await User.findByPk(parseId(rawId));
  if (!user) throw AppError.notFound("Usuário não encontrado");
  return serialize(user);
}

async function create(body = {}) {
  const errors = [];
  if (!isNonEmptyString(body.firstname)) errors.push("firstname é obrigatório");
  if (!isNonEmptyString(body.surname)) errors.push("surname é obrigatório");
  if (!isEmail(body.email)) errors.push("email inválido");
  if (typeof body.password !== "string" || body.password.length < 6) {
    errors.push("password é obrigatório e deve ter ao menos 6 caracteres");
  } else if (body.password !== body.confirmPassword) {
    errors.push("confirmPassword deve ser igual a password");
  }
  assertNoErrors(errors);

  const email = body.email.trim().toLowerCase();
  if (await User.findOne({ where: { email } }))
    throw AppError.badRequest("E-mail já cadastrado");

  const password = await bcrypt.hash(body.password, config.bcryptRounds);
  const user = await User.create({
    firstname: body.firstname.trim(),
    surname: body.surname.trim(),
    email,
    password,
  });
  return serialize(user);
}

async function update(rawId, body = {}) {
  const user = await User.findByPk(parseId(rawId));
  if (!user) throw AppError.notFound("Usuário não encontrado");

  const errors = [];
  const data = {};
  if (!isPlainObject(body)) errors.push("Corpo da requisição inválido");
  else {
    ["firstname", "surname"].forEach((k) => {
      if (body[k] === undefined) return;
      if (!isNonEmptyString(body[k]))
        errors.push(`${k} deve ser uma string não vazia`);
      else data[k] = body[k].trim();
    });
    if (body.email !== undefined) {
      if (!isEmail(body.email)) errors.push("email inválido");
      else data.email = body.email.trim().toLowerCase();
    }
    if (!Object.keys(data).length && !errors.length)
      errors.push("Informe ao menos um campo para atualizar");
  }
  assertNoErrors(errors);

  if (
    data.email &&
    data.email !== user.email &&
    (await User.findOne({ where: { email: data.email } }))
  ) {
    throw AppError.badRequest("E-mail já cadastrado");
  }
  await user.update(data);
}

async function remove(rawId) {
  const user = await User.findByPk(parseId(rawId));
  if (!user) throw AppError.notFound("Usuário não encontrado");
  await user.destroy();
}

// Gera o JWT a partir de e-mail/senha. Credenciais inválidas => 400 (conforme o escopo).
async function generateToken(body = {}) {
  const errors = [];
  if (!isEmail(body.email)) errors.push("email inválido");
  if (!isNonEmptyString(body.password)) errors.push("password é obrigatório");
  assertNoErrors(errors);

  // unscoped(): o defaultScope esconde o hash da senha, aqui precisamos dele
  const user = await User.unscoped().findOne({
    where: { email: body.email.trim().toLowerCase() },
  });
  const valid = user && (await bcrypt.compare(body.password, user.password));
  if (!valid) throw AppError.badRequest("E-mail ou senha inválidos");

  return jwt.sign(
    { sub: String(user.id), email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );
}

module.exports = { getById, create, update, remove, generateToken };
