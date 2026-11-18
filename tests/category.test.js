const { request, app, resetDb, closeDb, login } = require("./helpers");

let auth;
beforeEach(async () => {
  await resetDb();
  ({ auth } = await login());
});
afterAll(closeDb);

const create = (body) => request(app).post("/v1/category").set(auth).send(body);

describe("Categorias", () => {
  test("POST exige token (401) e valida payload (400)", async () => {
    expect(
      (await request(app).post("/v1/category").send({ name: "A", slug: "a" }))
        .status,
    ).toBe(401);
    expect((await create({ name: "A" })).status).toBe(400);
    expect(
      (await create({ name: "A", slug: "a", use_in_menu: "sim" })).status,
    ).toBe(400);
    const ok = await create({
      name: "Shoes",
      slug: "shoes",
      use_in_menu: true,
    });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({
      name: "Shoes",
      slug: "shoes",
      use_in_menu: true,
    });
  });

  test("GET /:id retorna 200 e 404", async () => {
    const { body } = await create({ name: "Shoes", slug: "shoes" });
    const res = await request(app).get(`/v1/category/${body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.use_in_menu).toBe(false); // padrão
    expect((await request(app).get("/v1/category/999")).status).toBe(404);
  });

  test("GET /search: paginação, limit=-1, fields e use_in_menu", async () => {
    for (let i = 1; i <= 15; i++)
      await create({
        name: `Cat ${i}`,
        slug: `cat-${i}`,
        use_in_menu: i % 2 === 0,
      });

    const def = await request(app).get("/v1/category/search");
    expect(def.status).toBe(200);
    expect(def.body).toMatchObject({ total: 15, limit: 12, page: 1 });
    expect(def.body.data).toHaveLength(12);

    const p2 = await request(app).get("/v1/category/search?limit=10&page=2");
    expect(p2.body.data).toHaveLength(5);

    const all = await request(app).get("/v1/category/search?limit=-1");
    expect(all.body.data).toHaveLength(15);

    const fields = await request(app).get(
      "/v1/category/search?fields=name,slug&limit=1",
    );
    expect(Object.keys(fields.body.data[0]).sort()).toEqual(["name", "slug"]);

    const menu = await request(app).get(
      "/v1/category/search?use_in_menu=true&limit=-1",
    );
    expect(menu.body.total).toBe(7);

    expect((await request(app).get("/v1/category/search?limit=0")).status).toBe(
      400,
    );
    expect(
      (await request(app).get("/v1/category/search?fields=senha")).status,
    ).toBe(400);
    expect(
      (await request(app).get("/v1/category/search?use_in_menu=talvez")).status,
    ).toBe(400);
  });

  test("PUT atualiza (204) e DELETE remove (204)", async () => {
    const { body } = await create({ name: "Shoes", slug: "shoes" });
    expect(
      (await request(app).put(`/v1/category/${body.id}`).send({ name: "X" }))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .put(`/v1/category/${body.id}`)
          .set(auth)
          .send({ name: "Boots", slug: "boots", use_in_menu: true })
      ).status,
    ).toBe(204);
    expect(
      (await request(app).get(`/v1/category/${body.id}`)).body,
    ).toMatchObject({ name: "Boots", use_in_menu: true });
    expect(
      (
        await request(app)
          .put(`/v1/category/${body.id}`)
          .set(auth)
          .send({ name: "" })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).put("/v1/category/999").set(auth).send({ name: "X" }))
        .status,
    ).toBe(404);
    expect(
      (await request(app).delete(`/v1/category/${body.id}`).set(auth)).status,
    ).toBe(204);
    expect(
      (await request(app).delete(`/v1/category/${body.id}`).set(auth)).status,
    ).toBe(404);
  });
});
