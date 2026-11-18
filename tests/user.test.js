const { request, app, resetDb, closeDb, login } = require("./helpers");

beforeEach(resetDb);
afterAll(closeDb);

const valid = {
  firstname: "Ana",
  surname: "Lima",
  email: "ana@mail.com",
  password: "123@123",
  confirmPassword: "123@123",
};

describe("Usuários", () => {
  test("POST /v1/user cria usuário (201) sem expor a senha", async () => {
    const res = await request(app).post("/v1/user").send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 1,
      firstname: "Ana",
      surname: "Lima",
      email: "ana@mail.com",
    });
  });

  test("POST /v1/user rejeita senhas diferentes, e-mail inválido e e-mail duplicado (400)", async () => {
    expect(
      (
        await request(app)
          .post("/v1/user")
          .send({ ...valid, confirmPassword: "x" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/v1/user")
          .send({ ...valid, email: "invalido" })
      ).status,
    ).toBe(400);
    await request(app).post("/v1/user").send(valid);
    expect((await request(app).post("/v1/user").send(valid)).status).toBe(400);
  });

  test("GET /v1/user/:id retorna 200 e 404", async () => {
    const { user } = await login();
    expect((await request(app).get(`/v1/user/${user.id}`)).status).toBe(200);
    expect((await request(app).get("/v1/user/999")).status).toBe(404);
  });

  test("POST /v1/user/token gera JWT (200) e rejeita credenciais erradas (400)", async () => {
    await request(app).post("/v1/user").send(valid);
    const ok = await request(app)
      .post("/v1/user/token")
      .send({ email: valid.email, password: valid.password });
    expect(ok.status).toBe(200);
    expect(typeof ok.body.token).toBe("string");
    expect(
      (
        await request(app)
          .post("/v1/user/token")
          .send({ email: valid.email, password: "errada!" })
      ).status,
    ).toBe(400);
  });

  test("PUT /v1/user/:id exige token (401) e atualiza (204)", async () => {
    const { user, auth } = await login();
    expect(
      (await request(app).put(`/v1/user/${user.id}`).send({ firstname: "Bia" }))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .put(`/v1/user/${user.id}`)
          .set({ Authorization: "Bearer lixo" })
          .send({ firstname: "Bia" })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .put(`/v1/user/${user.id}`)
          .set(auth)
          .send({ firstname: "Bia" })
      ).status,
    ).toBe(204);
    expect((await request(app).get(`/v1/user/${user.id}`)).body.firstname).toBe(
      "Bia",
    );
    expect(
      (
        await request(app)
          .put(`/v1/user/${user.id}`)
          .set(auth)
          .send({ email: "x" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put("/v1/user/999")
          .set(auth)
          .send({ firstname: "Z" })
      ).status,
    ).toBe(404);
  });

  test("DELETE /v1/user/:id remove (204) e depois 404", async () => {
    const { user, auth } = await login();
    expect((await request(app).delete(`/v1/user/${user.id}`)).status).toBe(401);
    expect(
      (await request(app).delete(`/v1/user/${user.id}`).set(auth)).status,
    ).toBe(204);
    expect(
      (await request(app).delete(`/v1/user/${user.id}`).set(auth)).status,
    ).toBe(404);
  });
});
