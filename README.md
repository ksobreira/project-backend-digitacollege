# Projeto Final Back-end FullStack Geração Tech 4.0: API de E-commerce

API REST para gerenciar **usuários**, **categorias** e **produtos** (com imagens, opções e categorias), com autenticação **JWT**. Os dados são persistidos em **MySQL**, com schema versionado por **migrations**.

**Equipe:** Kauam Sobreira

## Tecnologias

Node.js · Express · MySQL · Sequelize (+ migrations) · JWT · bcrypt · Dotenv · Nodemon · Jest/Supertest · Swagger UI

## Estrutura (padrão MVC + services)

```
src/
├── config/        # variáveis de ambiente e conexão com o banco
├── controllers/   # recebem a requisição e devolvem a resposta HTTP
├── services/      # regras de negócio, validações e acesso ao banco
├── models/        # models do Sequelize e associações
├── routes/        # definição das rotas
├── middleware/    # autenticação JWT e tratamento de erros
├── migrations/    # versionamento do schema
├── seeders/       # dados de demonstração
├── docs/          # documentação OpenAPI (Swagger)
├── utils/         # AppError, validadores, asyncHandler
├── app.js         # configuração do Express
└── server.js      # sobe o servidor
tests/             # testes automatizados (Jest + Supertest)
uploads/           # imagens dos produtos (não versionadas)
```

## Setup

### Pré-requisitos
- **Node.js 18+** (`node -v`)
- **MySQL 8+** instalado e em execução (porta 3306 por padrão). Teste com `mysql -u root -p`. Se usar XAMPP, inicie o módulo MySQL (o `root` vem sem senha).

### Passo a passo

```bash
git clone <url-do-seu-repositorio>
cd projeto-backend
npm install
cp .env.example .env          # Windows (cmd): copy .env.example .env
```

Edite o `.env` com os dados do seu MySQL (veja a tabela abaixo) e rode:

```bash
npm run db:create             # cria o banco definido em DB_NAME
npm run db:migrate            # cria as 6 tabelas
npm run db:seed               # (opcional) usuário admin@mail.com / 123@123 e 3 categorias
npm run dev                   # desenvolvimento (nodemon)   |   npm start → produção
```

Esperado no terminal: `Conexão com o banco de dados estabelecida` e `API rodando em http://localhost:3000`.

| URL | Descrição |
|---|---|
| `http://localhost:3000` | API |
| `http://localhost:3000/api-docs` | Documentação Swagger (botão **Authorize** aceita o token) |
| `http://localhost:3000/health` | Healthcheck |
| `http://localhost:3000/media/...` | Imagens dos produtos |

### Variáveis de ambiente (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta da API |
| `BASE_URL` | `http://localhost:3000` | Base das URLs de imagem retornadas |
| `DB_HOST` | `127.0.0.1` | Host do MySQL |
| `DB_PORT` | `3306` | Porta do MySQL |
| `DB_USER` | — | Usuário do MySQL |
| `DB_PASS` | — | Senha (deixe vazio se o usuário não tem senha) |
| `DB_NAME` | — | Nome do banco (criado por `npm run db:create`) |
| `JWT_SECRET` | — | Segredo de assinatura do token (obrigatório em produção) |
| `JWT_EXPIRES_IN` | `1h` | Validade do token |
| `AUTH_MISSING_TOKEN_STATUS` | `401` | Status quando o header `Authorization` não é enviado (`401` ou `400`) |
| `UPLOAD_DIR` | `./uploads` | Pasta das imagens (opcional) |

### Migrations

| Comando | Ação |
|---|---|
| `npm run db:migrate` | aplica as migrations |
| `npm run db:migrate:undo` | desfaz todas |
| `npm run db:seed` | insere os dados de demonstração |

Para recomeçar do zero: `npm run db:migrate:undo`, `npm run db:migrate` e `npm run db:seed`.

### Testes automatizados

```bash
npm test
```

Os testes usam **SQLite em memória** e uma pasta temporária para imagens. Por isso rodam em qualquer máquina e **não tocam no banco MySQL** configurado no `.env`.

## Como testar a API

1. Gere o token em `POST /v1/user/token` com `{"email":"admin@mail.com","password":"123@123"}` (após o `db:seed`) ou cadastre um usuário em `POST /v1/user`.
2. Use o token como `Authorization: Bearer <token>` nas rotas 🔒. No Swagger, clique em **Authorize**; no Insomnia/Postman, use a aba **Auth → Bearer Token**.
3. Ordem sugerida: criar categoria → criar produto → listar/filtrar → atualizar → remover.

Exemplo de criação de produto (`POST /v1/product`):

```json
{
  "enabled": true,
  "name": "Tênis Run",
  "slug": "tenis-run",
  "stock": 10,
  "description": "Tênis de corrida",
  "price": 150,
  "price_with_discount": 120,
  "category_ids": [1],
  "images": [{ "type": "image/png", "content": "<base64 da imagem>" }],
  "options": [{ "title": "Tamanho", "shape": "circle", "radius": "4px", "type": "text", "values": ["PP", "M", "GG"] }]
}
```

Exemplos de busca: `/v1/product/search?match=tênis&price-range=100-200&category_ids=1&limit=5&page=1&fields=name,price,images`, `/v1/product/search?option[1]=GG,PP`, `/v1/category/search?use_in_menu=true&limit=-1`.

## Endpoints

Rotas marcadas com 🔒 exigem `Authorization: Bearer <jwt>`.

| Método | Rota | Descrição | Status |
|---|---|---|---|
| POST | `/v1/user/token` | Gera o JWT | 200, 400 |
| POST | `/v1/user` | Cadastra usuário | 201, 400 |
| GET | `/v1/user/:id` | Busca usuário | 200, 404 |
| PUT 🔒 | `/v1/user/:id` | Atualiza usuário | 204, 400, 401, 404 |
| DELETE 🔒 | `/v1/user/:id` | Remove usuário | 204, 401, 404 |
| GET | `/v1/category/search` | Lista (`limit`, `page`, `fields`, `use_in_menu`) | 200, 400 |
| GET | `/v1/category/:id` | Busca categoria | 200, 404 |
| POST 🔒 | `/v1/category` | Cria categoria | 201, 400, 401 |
| PUT 🔒 | `/v1/category/:id` | Atualiza categoria | 204, 400, 401, 404 |
| DELETE 🔒 | `/v1/category/:id` | Remove categoria | 204, 401, 404 |
| GET | `/v1/product/search` | Lista (`limit`, `page`, `fields`, `match`, `category_ids`, `price-range`, `option[id]`) | 200, 400 |
| GET | `/v1/product/:id` | Busca produto | 200, 404 |
| POST 🔒 | `/v1/product` | Cria produto (imagens em base64) | 201, 400, 401 |
| PUT 🔒 | `/v1/product/:id` | Atualiza produto, imagens e opções | 204, 400, 401, 404 |
| DELETE 🔒 | `/v1/product/:id` | Remove produto | 204, 401, 404 |

Parâmetros de busca: `limit` (padrão 12; `-1` retorna todos) e `page` (padrão 1). A resposta é `{ data, total, limit, page }`.

## Banco de dados

Seis tabelas, criadas pelas migrations em `src/migrations/`:

| Tabela | Descrição |
|---|---|
| `users` | usuários (senha com hash bcrypt, e-mail único) |
| `categories` | categorias |
| `products` | produtos (índices em `name` e `price`) |
| `product_images` | imagens do produto (FK com `ON DELETE CASCADE`) |
| `product_options` | opções do produto (FK com `ON DELETE CASCADE`) |
| `product_categories` | relação N:N produto × categoria (chave primária composta) |

## Decisões de projeto

- **Rotas públicas:** `POST /v1/user` (cadastro) e `POST /v1/user/token` (login) não exigem token — sem isso ninguém conseguiria obter um. Todos os demais POST/PUT/DELETE exigem.
- **Token ausente:** o escopo cita 401 nos endpoints e 400 na Seção 05. Adotamos **401** (padrão HTTP); para usar 400 defina `AUTH_MISSING_TOKEN_STATUS=400` no `.env`. Token inválido ou expirado é sempre 401.
- **Login inválido:** responde 400, conforme o escopo.
- **ID inválido** (ex.: `/v1/user/abc`): 404, pois o recurso não pode existir.
- **Imagens:** recebidas em base64 (png, jpg, jpeg, gif, webp; até 5 MB), gravadas em `uploads/products/` e servidas em `/media/...`. O banco guarda só o caminho relativo.
- **Opções do produto:** aceita `values` e `value` (o escopo usa os dois); `radius` aceita `4` ou `"4px"`. Os valores ficam na coluna `values` separados por vírgula, portanto não podem conter vírgula.
- **Atualização de produto (PUT):** `images` e `options` aceitam novos itens, `{id, deleted:true}` e `{id, ...campos}`; `category_ids` substitui o conjunto. Tudo roda em **transação**; arquivos novos são removidos se ocorrer erro e os antigos só após o commit.
- **Filtro por opção:** `option[id]=valores` é lido da query string bruta, porque o parser do Express converte índices pequenos (`option[2]`) em array e perde o id.
- **Consultas eficientes:** a busca pagina primeiro apenas os ids e depois carrega as relações, evitando `LIMIT` quebrado por JOINs; só inclui relações pedidas em `fields`; há índices em `products(name, price)` e nas chaves estrangeiras.
- **Segurança:** senhas com bcrypt (nunca retornadas), JWT com expiração, `.env` fora do Git.

## Problemas comuns

| Erro | Solução |
|---|---|
| `ER_ACCESS_DENIED_ERROR` | `DB_USER` ou `DB_PASS` errados no `.env` |
| `ECONNREFUSED 127.0.0.1:3306` | O MySQL não está em execução |
| `Unknown database` | Rode `npm run db:create` |
| `Table ... doesn't exist` | Rode `npm run db:migrate` |
| `401` em rotas protegidas | Falta o header `Authorization: Bearer <token>` ou o token expirou; gere outro |
| Falha ao instalar `bcrypt`/`sqlite3` | Use Node LTS (18, 20 ou 22) e rode `npm install` de novo |