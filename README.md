# maputo-vendas-backend

API REST do **Sistema de Localização de Vendedores** (Maputo): os compradores procuram um produto,
encontram os vendedores mais próximos (por distância, preço ou avaliação), iniciam uma rota até ao
vendedor e avaliam-no no fim.

**Stack:** Node.js 18+, Express 4, MariaDB/MySQL (`mysql2`), JWT, express-validator, winston.

## Arranque rápido

```bash
npm install
cp .env.example .env        # e preencha DB_* e JWT_SECRET
npm run migrate             # cria a base de dados e as tabelas
npm run seed                # (opcional) categorias, produtos e contas de demonstração
npm run dev                 # ou: npm start
```

Contas de demonstração (seed), todas com a senha `senha123`:
`usuario@demo.co.mz` (comprador), `amelia@demo.co.mz`, `ze@demo.co.mz`, `xipamanine@demo.co.mz`,
`janet@demo.co.mz`, `zimpeto@demo.co.mz` (vendedores). **Não aplicar o seed em produção.**

### Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Ligação à base de dados | `localhost`, `3306`, `root`, vazio, `sistema_vendedores` |
| `JWT_SECRET` | Segredo dos tokens (obrigatório; ≥32 caracteres em produção) | — |
| `JWT_EXPIRES_IN` | Validade do token | `7d` |
| `PORT`, `NODE_ENV` | Servidor | `3000`, `development` |
| `CORS_ORIGINS` | Origens permitidas, separadas por vírgula (`*` = todas) | `http://localhost:3000,http://localhost:3001` |
| `GOOGLE_MAPS_API_KEY` | Opcional. Se definida, distância/tempo das rotas vêm da Directions API; caso contrário são estimados | — |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Limite global de pedidos por IP | `900000`, `100` |
| `AUTH_RATE_LIMIT_MAX` | Limite de login/registo por IP a cada 15 min | `20` |
| `TRUST_PROXY` | Definir quando atrás de proxy (ex.: `1`) | — |

## Estrutura

```
server.js                  app Express + arranque/encerramento
database/
  connection.js            pool mysql2, executeQuery, withTransaction
  migrate.js / seed.js     executam os .sql (suportam DELIMITER) e registam o que já foi aplicado
  migrations/  seeds/
src/
  routes/        → validação (express-validator) + autenticação
  controllers/   → HTTP (req/res)
  services/      → regras de negócio (auth, pesquisa, rotas, avaliações)
  repositories/  → SQL
  models/        → entidades (toJSON nunca expõe senha_hash)
  middleware/    → auth (JWT), validation, errorHandler
  utils/         → logger, respostas/AppError, validadores, geo (Haversine)
test/                      testes unitários e de integração (node:test)
```

## Endpoints

Base: `/api`. Respostas: `{ success, message, data, pagination? }`. Erros de validação: `400` com `errors: [{ campo, mensagem }]`.
Autenticação: `Authorization: Bearer <token>`. Há dois tipos de conta: **usuario** (comprador) e **vendedor**.

### Utilizadores (`/usuarios`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/registro` | — | `{ nome, email, senha, telefone? }` → `{ token, usuario }` |
| POST | `/login` | — | `{ email, senha }` |
| GET / PUT / DELETE | `/me` | usuario | Perfil; atualizar `{ nome?, telefone? }`; desativar conta |
| PUT | `/me/senha` | usuario | `{ senha_atual, nova_senha }` |
| GET / DELETE | `/me/pesquisas` | usuario | Histórico de pesquisas / apagar histórico |
| GET | `/me/avaliacoes` | usuario | Avaliações feitas |

### Vendedores (`/vendedores`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/registro` | — | `{ nome, email, senha, telefone, descricao?, endereco?, latitude?, longitude? }` |
| POST | `/login` | — | `{ email, senha }` |
| GET | `/` | — | Lista (`?nome=&page=&limit=`) |
| GET | `/:id` | — | Detalhe + produtos disponíveis |
| GET | `/:id/produtos` | — | Produtos disponíveis |
| GET | `/:id/avaliacoes` | — | Avaliações + resumo (média, distribuição 1–5) |
| GET / PUT / DELETE | `/me` | vendedor | Perfil `{ nome?, telefone?, descricao?, endereco? }` |
| PUT | `/me/localizacao` | vendedor | `{ latitude, longitude, endereco? }` |
| PUT | `/me/senha` | vendedor | `{ senha_atual, nova_senha }` |
| GET / POST | `/me/produtos` | vendedor | Listar / adicionar `{ id_produto, preco, quantidade_disponivel?, disponivel? }` |
| PUT / DELETE | `/me/produtos/:idProduto` | vendedor | Atualizar preço/stock/disponibilidade / remover |
| GET | `/me/rotas` | vendedor | Compradores a caminho (`?status=`) |

### Produtos (`/produtos`)
`GET /` (`?nome=&categoria=&page=&limit=`, inclui nº de vendedores e preço mínimo), `GET /categorias`,
`GET /mais-pesquisados?dias=30`, `GET /:id`.

### Pesquisa (`/pesquisa`)
- `GET /vendedores?lat=&lng=` — ofertas próximas. Filtros: `produto`, `termo`, `categoria`, `raio` (km, padrão 5, máx. 50),
  `preco_min`, `preco_max`, `ordenar=distancia|preco|avaliacao`, `page`, `limit`.
  Pública; com token de utilizador fica registada no histórico.
- `GET /proximos?lat=&lng=&raio=` — vendedores próximos (sem filtro de produto).

### Rotas (`/rotas`)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/` | usuario | `{ id_vendedor, id_produto, latitude_origem, longitude_origem, modo_transporte? }` → distância, tempo e `link_navegacao` (Google Maps) |
| GET | `/` | usuario | Minhas rotas (`?status=`) |
| GET | `/:id` | usuario ou vendedor de destino | Detalhe |
| PATCH | `/:id/status` | usuario | `{ status: em_andamento \| concluida \| cancelada }` (transições validadas) |

### Avaliações (`/avaliacoes`)
`POST /` `{ id_vendedor, nota (1–5), comentario?, id_rota? }` · `PUT /:id` · `DELETE /:id` (apenas o autor).
Uma avaliação por vendedor por rota (ou uma sem rota). Avaliar com `id_rota` conclui a rota.
A média do vendedor é mantida por triggers na base de dados.

## Testes

```bash
npm test   # testes unitários
```

Os testes de integração correm contra uma base de dados real e só são executados se `TEST_DB_NAME`
estiver definido. **A base indicada é apagada e recriada**, por isso o nome tem de terminar em `_test`:

```bash
docker run -d --name vendas-testdb -e MARIADB_ROOT_PASSWORD=testpass -p 3307:3306 mariadb:11
TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3307 TEST_DB_USER=root TEST_DB_PASSWORD=testpass \
TEST_DB_NAME=sistema_vendedores_test npm test
```

Validado com MariaDB 11 e MySQL 8.4.
