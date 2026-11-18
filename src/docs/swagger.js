// Documentação OpenAPI 3 da API, exibida em /api-docs (Swagger UI).
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ "application/json": { schema } });
const secured = [{ bearerAuth: [] }];
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer" },
};
const r = (description, schema) => ({
  description,
  ...(schema && { content: json(schema) }),
});
const err400 = r("Dados inválidos", ref("Error"));
const err401 = r("Token ausente, inválido ou expirado", ref("Error"));
const err404 = r("Recurso não encontrado", ref("Error"));

module.exports = {
  openapi: "3.0.3",

  info: {
    title: "Projeto Back-end - API de e-commerce",
    version: "1.0.0",
    description:
      "CRUD de usuários, categorias e produtos com autenticação JWT.",
  },

  servers: [{ url: "/" }],
  tags: [{ name: "Usuários" }, { name: "Categorias" }, { name: "Produtos" }],

  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },

    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
          errors: { type: "array", items: { type: "string" } },
        },
      },

      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          firstname: { type: "string" },
          surname: { type: "string" },
          email: { type: "string" },
        },
      },

      UserCreate: {
        type: "object",
        required: [
          "firstname",
          "surname",
          "email",
          "password",
          "confirmPassword",
        ],
        properties: {
          firstname: { type: "string" },
          surname: { type: "string" },
          email: { type: "string", example: "user@mail.com" },
          password: { type: "string", example: "123@123" },
          confirmPassword: { type: "string", example: "123@123" },
        },
      },

      UserUpdate: {
        type: "object",
        properties: {
          firstname: { type: "string" },
          surname: { type: "string" },
          email: { type: "string" },
        },
      },

      Login: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "user@mail.com" },
          password: { type: "string", example: "123@123" },
        },
      },

      Token: { type: "object", properties: { token: { type: "string" } } },
      Category: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          slug: { type: "string" },
          use_in_menu: { type: "boolean" },
        },
      },

      CategoryInput: {
        type: "object",
        required: ["name", "slug"],
        properties: {
          name: { type: "string", example: "Shoes" },
          slug: { type: "string", example: "shoes" },
          use_in_menu: { type: "boolean", example: true },
        },
      },

      CategoryList: {
        type: "object",
        properties: {
          data: { type: "array", items: ref("Category") },
          total: { type: "integer" },
          limit: { type: "integer" },
          page: { type: "integer" },
        },
      },

      ProductOption: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string", example: "Tamanho" },
          shape: { type: "string", enum: ["square", "circle"] },
          radius: { type: "integer", example: 4 },
          type: { type: "string", enum: ["text", "color"] },
          values: {
            type: "array",
            items: { type: "string" },
            example: ["PP", "M", "GG"],
          },
        },
      },

      ProductImage: {
        type: "object",
        properties: {
          id: { type: "integer" },
          content: {
            type: "string",
            example: "http://localhost:3000/media/products/abc.png",
          },
        },
      },

      Product: {
        type: "object",
        properties: {
          id: { type: "integer" },
          enabled: { type: "boolean" },
          name: { type: "string" },
          slug: { type: "string" },
          use_in_menu: { type: "boolean" },
          stock: { type: "integer" },
          description: { type: "string" },
          price: { type: "number" },
          price_with_discount: { type: "number" },
          category_ids: { type: "array", items: { type: "integer" } },
          images: { type: "array", items: ref("ProductImage") },
          options: { type: "array", items: ref("ProductOption") },
        },
      },

      ProductCreate: {
        type: "object",
        required: ["name", "slug", "price", "price_with_discount"],
        properties: {
          enabled: { type: "boolean", example: true },
          name: { type: "string", example: "Produto 01" },
          slug: { type: "string", example: "produto-01" },
          use_in_menu: { type: "boolean" },
          stock: { type: "integer", example: 10 },
          description: { type: "string" },
          price: { type: "number", example: 119.9 },
          price_with_discount: { type: "number", example: 99.9 },
          category_ids: {
            type: "array",
            items: { type: "integer" },
            example: [1],
          },

          images: {
            type: "array",
            description:
              "Novas: {type, content(base64)}. No PUT também: {id, deleted:true} ou {id, content(base64)}.",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                type: { type: "string", example: "image/png" },
                content: { type: "string" },
                deleted: { type: "boolean" },
              },
            },
          },

          options: {
            type: "array",
            description:
              "No PUT também: {id, deleted:true} ou {id, ...campos}.",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                deleted: { type: "boolean" },
                title: { type: "string" },
                shape: { type: "string" },
                radius: { type: "string", example: "4px" },
                type: { type: "string" },
                values: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    },
  },

  paths: {
    "/v1/user/token": {
      post: {
        tags: ["Usuários"],
        summary: "Gera o token JWT",
        requestBody: { required: true, content: json(ref("Login")) },
        responses: { 200: r("Token gerado", ref("Token")), 400: err400 },
      },
    },

    "/v1/user": {
      post: {
        tags: ["Usuários"],
        summary: "Cadastra usuário",
        requestBody: { required: true, content: json(ref("UserCreate")) },
        responses: { 201: r("Criado", ref("User")), 400: err400 },
      },
    },

    "/v1/user/{id}": {
      get: {
        tags: ["Usuários"],
        summary: "Busca usuário por ID",
        parameters: [idParam],
        responses: { 200: r("OK", ref("User")), 404: err404 },
      },

      put: {
        tags: ["Usuários"],
        summary: "Atualiza usuário",
        security: secured,
        parameters: [idParam],
        requestBody: { required: true, content: json(ref("UserUpdate")) },
        responses: {
          204: r("Atualizado"),
          400: err400,
          401: err401,
          404: err404,
        },
      },

      delete: {
        tags: ["Usuários"],
        summary: "Remove usuário",
        security: secured,
        parameters: [idParam],
        responses: { 204: r("Removido"), 401: err401, 404: err404 },
      },
    },

    "/v1/category/search": {
      get: {
        tags: ["Categorias"],
        summary: "Lista categorias (paginação e filtros)",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 12 },
            description: "-1 retorna todos",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "fields",
            in: "query",
            schema: { type: "string" },
            example: "name,slug",
          },
          { name: "use_in_menu", in: "query", schema: { type: "boolean" } },
        ],
        responses: { 200: r("OK", ref("CategoryList")), 400: err400 },
      },
    },

    "/v1/category": {
      post: {
        tags: ["Categorias"],
        summary: "Cria categoria",
        security: secured,
        requestBody: { required: true, content: json(ref("CategoryInput")) },
        responses: {
          201: r("Criada", ref("Category")),
          400: err400,
          401: err401,
        },
      },
    },

    "/v1/category/{id}": {
      get: {
        tags: ["Categorias"],
        summary: "Busca categoria por ID",
        parameters: [idParam],
        responses: { 200: r("OK", ref("Category")), 404: err404 },
      },
      put: {
        tags: ["Categorias"],
        summary: "Atualiza categoria",
        security: secured,
        parameters: [idParam],
        requestBody: { required: true, content: json(ref("CategoryInput")) },
        responses: {
          204: r("Atualizada"),
          400: err400,
          401: err401,
          404: err404,
        },
      },
      delete: {
        tags: ["Categorias"],
        summary: "Remove categoria",
        security: secured,
        parameters: [idParam],
        responses: { 204: r("Removida"), 401: err401, 404: err404 },
      },
    },

    "/v1/product/search": {
      get: {
        tags: ["Produtos"],
        summary: "Lista produtos (paginação e filtros)",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 12 },
            description: "-1 retorna todos",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "fields",
            in: "query",
            schema: { type: "string" },
            example: "name,images,price",
          },
          {
            name: "match",
            in: "query",
            schema: { type: "string" },
            description: "Termo no nome ou descrição",
          },
          {
            name: "category_ids",
            in: "query",
            schema: { type: "string" },
            example: "15,24",
          },
          {
            name: "price-range",
            in: "query",
            schema: { type: "string" },
            example: "100-200",
          },
          {
            name: "option[45]",
            in: "query",
            schema: { type: "string" },
            example: "GG,PP",
            description: "Filtra pelos valores da opção de ID 45",
          },
        ],
        responses: {
          200: r("OK", {
            type: "object",
            properties: {
              data: { type: "array", items: ref("Product") },
              total: { type: "integer" },
              limit: { type: "integer" },
              page: { type: "integer" },
            },
          }),
          400: err400,
        },
      },
    },

    "/v1/product": {
      post: {
        tags: ["Produtos"],
        summary: "Cria produto (com imagens base64, opções e categorias)",
        security: secured,
        requestBody: { required: true, content: json(ref("ProductCreate")) },
        responses: {
          201: r("Criado", ref("Product")),
          400: err400,
          401: err401,
        },
      },
    },

    "/v1/product/{id}": {
      get: {
        tags: ["Produtos"],
        summary: "Busca produto por ID",
        parameters: [idParam],
        responses: { 200: r("OK", ref("Product")), 404: err404 },
      },

      put: {
        tags: ["Produtos"],
        summary: "Atualiza produto (imagens/opções: criar, alterar, remover)",
        security: secured,
        parameters: [idParam],
        requestBody: { required: true, content: json(ref("ProductCreate")) },
        responses: {
          204: r("Atualizado"),
          400: err400,
          401: err401,
          404: err404,
        },
      },
      
      delete: {
        tags: ["Produtos"],
        summary: "Remove produto",
        security: secured,
        parameters: [idParam],
        responses: { 204: r("Removido"), 401: err401, 404: err404 },
      },
    },
  },
};
