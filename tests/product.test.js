const { request, app, PNG, resetDb, closeDb, login } = require("./helpers");

let auth;
let catA;
let catB;

beforeEach(async () => {
  await resetDb();
  ({ auth } = await login());
  catA = (
    await request(app)
      .post("/v1/category")
      .set(auth)
      .send({ name: "A", slug: "a" })
  ).body.id;
  catB = (
    await request(app)
      .post("/v1/category")
      .set(auth)
      .send({ name: "B", slug: "b" })
  ).body.id;
});
afterAll(closeDb);

const base = (over = {}) => ({
  enabled: true,
  name: "Tênis Run",
  slug: "tenis-run",
  stock: 10,
  description: "Tênis de corrida",
  price: 150,
  price_with_discount: 120,
  category_ids: [catA],
  images: [{ type: "image/png", content: PNG }],
  options: [
    {
      title: "Tamanho",
      shape: "circle",
      radius: "4px",
      type: "text",
      values: ["PP", "M", "GG"],
    },
  ],
  ...over,
});
const create = (body) => request(app).post("/v1/product").set(auth).send(body);

describe("Produtos - criação e leitura", () => {
  test("POST exige token (401) e valida dados (400)", async () => {
    expect((await request(app).post("/v1/product").send(base())).status).toBe(
      401,
    );
    expect((await create(base({ name: "" }))).status).toBe(400);
    expect((await create(base({ price: "caro" }))).status).toBe(400);
    expect((await create(base({ price_with_discount: 999 }))).status).toBe(400);
    expect((await create(base({ category_ids: [9999] }))).status).toBe(400);
    expect(
      (await create(base({ images: [{ type: "image/png", content: "***" }] })))
        .status,
    ).toBe(400);
    expect(
      (await create(base({ images: [{ type: "text/plain", content: PNG }] })))
        .status,
    ).toBe(400);
    expect(
      (
        await create(
          base({ options: [{ title: "X", shape: "triangle", values: ["a"] }] }),
        )
      ).status,
    ).toBe(400);
  });

  test("POST cria produto completo (201) e GET /:id devolve imagens, opções e categorias", async () => {
    const res = await create(base());
    expect(res.status).toBe(201);
    const got = await request(app).get(`/v1/product/${res.body.id}`);
    expect(got.status).toBe(200);
    expect(got.body).toMatchObject({
      name: "Tênis Run",
      price: 150,
      category_ids: [catA],
    });
    expect(got.body.images).toHaveLength(1);
    expect(got.body.images[0].content).toMatch(/\/media\/products\/.+\.png$/);
    expect(got.body.options[0]).toMatchObject({
      title: "Tamanho",
      shape: "circle",
      radius: 4,
      values: ["PP", "M", "GG"],
    });

    // a imagem salva é servida estaticamente
    const img = await request(app).get(
      new URL(got.body.images[0].content).pathname,
    );
    expect(img.status).toBe(200);
  });

  test("GET /:id inexistente retorna 404", async () => {
    expect((await request(app).get("/v1/product/999")).status).toBe(404);
    expect((await request(app).get("/v1/product/abc")).status).toBe(404);
  });
});

describe("Produtos - busca", () => {
  beforeEach(async () => {
    await create(
      base({
        name: "Tênis Run",
        price: 150,
        price_with_discount: 100,
        category_ids: [catA],
      }),
    );
    await create(
      base({
        name: "Camiseta",
        slug: "camiseta",
        description: "Algodão",
        price: 50,
        price_with_discount: 40,
        category_ids: [catB],
        images: [],
        options: [{ title: "Tamanho", values: ["P", "G"] }],
      }),
    );
    await create(
      base({
        name: "Bota",
        slug: "bota",
        description: "Couro tênis style",
        price: 300,
        price_with_discount: 250,
        category_ids: [catA, catB],
        images: [],
        options: [],
      }),
    );
  });

  test("paginação padrão e limit=-1", async () => {
    const res = await request(app).get("/v1/product/search");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, limit: 12, page: 1 });
    const p = await request(app).get("/v1/product/search?limit=2&page=2");
    expect(p.body.data).toHaveLength(1);
    expect(
      (await request(app).get("/v1/product/search?limit=-1")).body.data,
    ).toHaveLength(3);
  });

  test("match (nome ou descrição)", async () => {
    const res = await request(app).get("/v1/product/search?match=tênis");
    expect(res.body.data.map((p) => p.name).sort()).toEqual([
      "Bota",
      "Tênis Run",
    ]);
  });

  test("category_ids, price-range e combinação de filtros", async () => {
    expect(
      (await request(app).get(`/v1/product/search?category_ids=${catB}`)).body
        .total,
    ).toBe(2);
    expect(
      (await request(app).get("/v1/product/search?price-range=100-200")).body
        .total,
    ).toBe(1);
    const combo = await request(app).get(
      `/v1/product/search?category_ids=${catA}&price-range=200-400`,
    );
    expect(combo.body.data.map((p) => p.name)).toEqual(["Bota"]);
  });

  test("filtro por opção option[id]=valores", async () => {
    const all = await request(app).get("/v1/product/search?limit=-1");
    const optionId = all.body.data.find((p) => p.name === "Camiseta").options[0]
      .id;
    const res = await request(app).get(
      `/v1/product/search?option[${optionId}]=G,XG`,
    );
    expect(res.body.data.map((p) => p.name)).toEqual(["Camiseta"]);
    expect(
      (await request(app).get(`/v1/product/search?option[${optionId}]=ZZ`)).body
        .total,
    ).toBe(0);
  });

  test("fields limita as propriedades retornadas", async () => {
    const res = await request(app).get(
      "/v1/product/search?fields=name,price,images&limit=1",
    );
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ["id", "images", "name", "price"].filter((k) => k !== "id"),
    );
  });

  test("parâmetros inválidos retornam 400", async () => {
    for (const q of [
      "limit=x",
      "page=0",
      "price-range=abc",
      "price-range=200-100",
      "category_ids=a",
      "fields=foo",
      "option[x]=1",
    ]) {
      expect((await request(app).get(`/v1/product/search?${q}`)).status).toBe(
        400,
      );
    }
  });
});

describe("Produtos - atualização e remoção", () => {
  test("PUT altera dados, categorias, imagens e opções (204)", async () => {
    const created = (await create(base())).body;
    const [img] = created.images;
    const [opt] = created.options;

    const res = await request(app)
      .put(`/v1/product/${created.id}`)
      .set(auth)
      .send({
        name: "Tênis Run v2",
        price: 200,
        price_with_discount: 0,
        stock: 3,
        category_ids: [catB],
        images: [
          { type: "image/png", content: PNG },
          { id: img.id, deleted: true },
        ],
        options: [
          { id: opt.id, radius: "10px", values: ["42/43", "44/45"] },
          { title: "Cor", type: "color", values: ["#000", "#333"] },
        ],
      });
    expect(res.status).toBe(204);

    const got = (await request(app).get(`/v1/product/${created.id}`)).body;
    expect(got).toMatchObject({
      name: "Tênis Run v2",
      price: 200,
      stock: 3,
      category_ids: [catB],
    });
    expect(got.images).toHaveLength(1);
    expect(got.images[0].id).not.toBe(img.id);
    expect(got.options).toHaveLength(2);
    expect(got.options[0]).toMatchObject({
      radius: 10,
      values: ["42/43", "44/45"],
    });
    expect(got.options[1]).toMatchObject({ title: "Cor", type: "color" });
  });

  test("PUT: remover opção e erros 400/401/404", async () => {
    const created = (await create(base())).body;
    const url = `/v1/product/${created.id}`;
    expect((await request(app).put(url).send({ name: "x" })).status).toBe(401);
    expect(
      (await request(app).put(url).set(auth).send({ price: -1 })).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put(url)
          .set(auth)
          .send({ images: [{ id: 9999, deleted: true }] })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).put("/v1/product/999").set(auth).send({ name: "x" }))
        .status,
    ).toBe(404);

    expect(
      (
        await request(app)
          .put(url)
          .set(auth)
          .send({ options: [{ id: created.options[0].id, deleted: true }] })
      ).status,
    ).toBe(204);
    expect((await request(app).get(url)).body.options).toHaveLength(0);
  });

  test("DELETE remove o produto (204) e depois 404", async () => {
    const created = (await create(base())).body;
    const url = `/v1/product/${created.id}`;
    expect((await request(app).delete(url)).status).toBe(401);
    expect((await request(app).delete(url).set(auth)).status).toBe(204);
    expect((await request(app).get(url)).status).toBe(404);
    expect((await request(app).delete(url).set(auth)).status).toBe(404);
  });
});
