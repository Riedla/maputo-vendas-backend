/**
 * Testes de integração ponta-a-ponta contra uma base de dados real.
 * Só correm se TEST_DB_NAME estiver definido (o nome tem de terminar em "_test",
 * porque a base de dados é APAGADA e recriada). Exemplo:
 *
 *   TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3307 TEST_DB_USER=root TEST_DB_PASSWORD=... \
 *   TEST_DB_NAME=sistema_vendedores_test npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const TEST_DB = process.env.TEST_DB_NAME;
const skip = !TEST_DB ? 'TEST_DB_NAME não definido' : false;

if (TEST_DB) {
  if (!TEST_DB.endsWith('_test')) throw new Error('TEST_DB_NAME tem de terminar em "_test"');
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DB_HOST: process.env.TEST_DB_HOST || '127.0.0.1',
    DB_PORT: process.env.TEST_DB_PORT || '3306',
    DB_USER: process.env.TEST_DB_USER || 'root',
    DB_PASSWORD: process.env.TEST_DB_PASSWORD || '',
    DB_NAME: TEST_DB,
    JWT_SECRET: 'segredo-de-teste',
    GOOGLE_MAPS_API_KEY: '',
    RATE_LIMIT_MAX_REQUESTS: '100000',
    AUTH_RATE_LIMIT_MAX: '100000'
  });
}

let server;
let base;

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json() };
}

const MERCADO_CENTRAL = { lat: -25.9692, lng: 32.5732 };
const ctx = {};

before(async () => {
  if (skip) return;
  const path = require('path');
  const mysql = require('mysql2/promise');
  const { runSqlDir } = require('../database/migrate');
  const dbConfig = require('../src/config/database');

  const { database, ...serverConfig } = dbConfig;
  const conn = await mysql.createConnection(serverConfig);
  await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await conn.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.changeUser({ database });
  await runSqlDir(conn, path.join(__dirname, '../database/migrations'), '_MIGRACOES');
  await runSqlDir(conn, path.join(__dirname, '../database/seeds'), '_SEEDS');
  await conn.end();

  await require('../database/connection').connectDatabase();
  const { createApp } = require('../server');
  await new Promise((resolve) => {
    server = createApp().listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (skip) return;
  await new Promise((r) => server.close(r));
  await require('../database/connection').closeDatabase();
});

test('health e 404', { skip }, async () => {
  assert.equal((await api('GET', '/health')).status, 200);
  const r = await api('GET', '/api/nao-existe');
  assert.equal(r.status, 404);
  assert.equal(r.body.success, false);
});

test('JSON inválido devolve 400', { skip }, async () => {
  const res = await fetch(`${base}/api/usuarios/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{mal'
  });
  assert.equal(res.status, 400);
});

test('registo e login de utilizador', { skip }, async () => {
  const dados = { nome: 'Ana Teste', email: 'Ana@Teste.co.mz', senha: 'segredo1', telefone: '84 555 1234' };
  const reg = await api('POST', '/api/usuarios/registro', { body: dados });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  assert.ok(reg.body.data.token);
  assert.equal(reg.body.data.usuario.email, 'ana@teste.co.mz');
  assert.equal(reg.body.data.usuario.telefone, '+258845551234');
  assert.equal(reg.body.data.usuario.senha_hash, undefined);

  assert.equal((await api('POST', '/api/usuarios/registro', { body: dados })).status, 409);
  // email já usado por um vendedor também é rejeitado
  assert.equal((await api('POST', '/api/usuarios/registro', { body: { ...dados, email: 'amelia@demo.co.mz' } })).status, 409);

  const invalido = await api('POST', '/api/usuarios/registro', { body: { ...dados, email: 'x', telefone: '123' } });
  assert.equal(invalido.status, 400);
  assert.deepEqual(invalido.body.errors.map((e) => e.campo).sort(), ['email', 'telefone']);

  assert.equal((await api('POST', '/api/usuarios/login', { body: { email: dados.email, senha: 'errada' } })).status, 401);
  assert.equal((await api('POST', '/api/usuarios/login', { body: { email: 'nao@existe.mz', senha: 'x' } })).status, 401);
  const login = await api('POST', '/api/usuarios/login', { body: { email: dados.email, senha: dados.senha } });
  assert.equal(login.status, 200);
  ctx.userToken = login.body.data.token;
  ctx.userId = login.body.data.usuario.id_usuario;
});

test('autenticação e autorização', { skip }, async () => {
  assert.equal((await api('GET', '/api/usuarios/me')).status, 401);
  assert.equal((await api('GET', '/api/usuarios/me', { token: 'lixo' })).status, 401);
  const me = await api('GET', '/api/usuarios/me', { token: ctx.userToken });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.senha_hash, undefined);

  const vend = await api('POST', '/api/vendedores/login', { body: { email: 'ze@demo.co.mz', senha: 'senha123' } });
  assert.equal(vend.status, 200);
  ctx.zeToken = vend.body.data.token;
  assert.equal((await api('GET', '/api/usuarios/me', { token: ctx.zeToken })).status, 403);
  assert.equal((await api('GET', '/api/vendedores/me', { token: ctx.userToken })).status, 403);
});

test('atualizar perfil ignora campos não permitidos', { skip }, async () => {
  const r = await api('PUT', '/api/usuarios/me', {
    token: ctx.userToken,
    body: { nome: 'Ana Actualizada', ativo: false, email: 'outro@x.mz', 'ativo = 0, nome': 'x' }
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.nome, 'Ana Actualizada');
  assert.equal(r.body.data.email, 'ana@teste.co.mz');
  assert.equal(r.body.data.ativo, true);
});

test('alterar senha', { skip }, async () => {
  assert.equal((await api('PUT', '/api/usuarios/me/senha', {
    token: ctx.userToken, body: { senha_atual: 'errada', nova_senha: 'novasenha' }
  })).status, 401);
  assert.equal((await api('PUT', '/api/usuarios/me/senha', {
    token: ctx.userToken, body: { senha_atual: 'segredo1', nova_senha: 'novasenha' }
  })).status, 200);
  assert.equal((await api('POST', '/api/usuarios/login', { body: { email: 'ana@teste.co.mz', senha: 'novasenha' } })).status, 200);
});

test('produtos e categorias', { skip }, async () => {
  const cats = await api('GET', '/api/produtos/categorias');
  assert.equal(cats.body.data.length, 6);
  const lista = await api('GET', '/api/produtos?categoria=1&limit=2');
  assert.equal(lista.body.pagination.total, 5);
  assert.equal(lista.body.data.length, 2);
  const tomate = (await api('GET', '/api/produtos?nome=tomat')).body.data[0];
  assert.equal(tomate.nome, 'Tomate');
  assert.equal(tomate.total_vendedores, 2);
  assert.equal(tomate.preco_minimo, 55);
  assert.equal((await api('GET', '/api/produtos/9999')).status, 404);
  assert.equal((await api('GET', '/api/produtos/abc')).status, 400);
});

test('pesquisa de vendedores por proximidade', { skip }, async () => {
  const q = `lat=${MERCADO_CENTRAL.lat}&lng=${MERCADO_CENTRAL.lng}`;

  const porDist = await api('GET', `/api/pesquisa/vendedores?${q}&produto=1&raio=5`);
  assert.equal(porDist.status, 200, JSON.stringify(porDist.body));
  assert.deepEqual(porDist.body.data.map((o) => o.vendedor.id_vendedor), [1, 3]);
  assert.equal(porDist.body.data[0].distancia_km, 0);
  assert.ok(porDist.body.data[1].distancia_km > 2 && porDist.body.data[1].distancia_km < 4);

  const porPreco = await api('GET', `/api/pesquisa/vendedores?${q}&produto=1&ordenar=preco`);
  assert.deepEqual(porPreco.body.data.map((o) => o.preco), [55, 60]);

  const raio1 = await api('GET', `/api/pesquisa/vendedores?${q}&produto=1&raio=1`);
  assert.equal(raio1.body.pagination.total, 1);

  const termo = await api('GET', `/api/pesquisa/vendedores?${q}&termo=camar&raio=10`);
  assert.equal(termo.body.data[0].produto.nome, 'Camarão');

  const faixa = await api('GET', `/api/pesquisa/vendedores?${q}&preco_min=100&preco_max=10`);
  assert.equal(faixa.status, 400);
  assert.equal((await api('GET', '/api/pesquisa/vendedores?lat=200&lng=1')).status, 400);
  assert.equal((await api('GET', `/api/pesquisa/vendedores?${q}&produto=999`)).status, 404);

  const proximos = await api('GET', `/api/pesquisa/proximos?${q}&raio=20`);
  assert.equal(proximos.body.pagination.total, 5);
  assert.equal(proximos.body.data[0].id_vendedor, 1);
});

test('histórico de pesquisas do utilizador autenticado', { skip }, async () => {
  const q = `lat=${MERCADO_CENTRAL.lat}&lng=${MERCADO_CENTRAL.lng}`;
  await api('GET', `/api/pesquisa/vendedores?${q}&produto=2`, { token: ctx.userToken });
  await api('GET', `/api/pesquisa/vendedores?${q}&produto=2&page=2`, { token: ctx.userToken }); // não regista
  await new Promise((r) => setTimeout(r, 200)); // o registo é assíncrono

  const hist = await api('GET', '/api/usuarios/me/pesquisas', { token: ctx.userToken });
  assert.equal(hist.body.pagination.total, 1);
  assert.equal(hist.body.data[0].produto, 'Cebola');
  // Cebola: Mercado Central (0 km) e Zimpeto (~11 km, fora do raio padrão de 5 km)
  assert.equal(hist.body.data[0].total_resultados, 1);
  assert.equal(hist.body.data[0].raio_busca_km, 5);

  const mais = await api('GET', '/api/produtos/mais-pesquisados');
  assert.equal(mais.body.data[0].nome, 'Cebola');

  assert.equal((await api('DELETE', '/api/usuarios/me/pesquisas', { token: ctx.userToken })).body.data.removidas, 1);
});

test('vendedor: registo, localização e gestão de produtos', { skip }, async () => {
  const reg = await api('POST', '/api/vendedores/registro', {
    body: { nome: 'Banca Nova', email: 'nova@banca.mz', senha: 'segredo1', telefone: '+258 86 000 0000' }
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  assert.equal(reg.body.data.vendedor.latitude, null);
  const token = reg.body.data.token;
  ctx.novoVendedorId = reg.body.data.vendedor.id_vendedor;

  assert.equal((await api('POST', '/api/vendedores/registro', {
    body: { nome: 'X', email: 'y@y.mz', senha: 'segredo1', telefone: '840000000', latitude: 10 }
  })).status, 400);

  const loc = await api('PUT', '/api/vendedores/me/localizacao', {
    token, body: { latitude: -25.9700, longitude: 32.5740, endereco: 'Baixa' }
  });
  assert.equal(loc.status, 200);
  assert.equal(loc.body.data.latitude, -25.97);
  assert.ok(loc.body.data.localizacao_atualizada_em);

  const add = await api('POST', '/api/vendedores/me/produtos', { token, body: { id_produto: 1, preco: 50, quantidade_disponivel: 10 } });
  assert.equal(add.status, 201, JSON.stringify(add.body));
  assert.equal(add.body.data.produto, 'Tomate');
  assert.equal((await api('POST', '/api/vendedores/me/produtos', { token, body: { id_produto: 1, preco: 50 } })).status, 409);
  assert.equal((await api('POST', '/api/vendedores/me/produtos', { token, body: { id_produto: 999, preco: 50 } })).status, 404);
  assert.equal((await api('POST', '/api/vendedores/me/produtos', { token, body: { id_produto: 2, preco: -5 } })).status, 400);

  const q = `lat=${MERCADO_CENTRAL.lat}&lng=${MERCADO_CENTRAL.lng}&produto=1&ordenar=preco`;
  let busca = await api('GET', `/api/pesquisa/vendedores?${q}`);
  assert.equal(busca.body.data[0].vendedor.id_vendedor, ctx.novoVendedorId);

  // Stock 0 => deixa de aparecer na pesquisa
  const upd = await api('PUT', '/api/vendedores/me/produtos/1', { token, body: { quantidade_disponivel: 0 } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.preco, 50);
  busca = await api('GET', `/api/pesquisa/vendedores?${q}`);
  assert.ok(!busca.body.data.some((o) => o.vendedor.id_vendedor === ctx.novoVendedorId));

  assert.equal((await api('PUT', '/api/vendedores/me/produtos/5', { token, body: { preco: 1 } })).status, 404);
  assert.equal((await api('DELETE', '/api/vendedores/me/produtos/1', { token })).status, 200);
  assert.equal((await api('GET', '/api/vendedores/me/produtos', { token })).body.data.length, 0);

  const publico = await api('GET', '/api/vendedores/2');
  assert.equal(publico.body.data.produtos.length, 2);
  assert.equal(publico.body.data.senha_hash, undefined);
  ctx.novoVendedorToken = token;
});

test('rotas até ao vendedor', { skip }, async () => {
  const body = { id_vendedor: 2, id_produto: 11, latitude_origem: MERCADO_CENTRAL.lat, longitude_origem: MERCADO_CENTRAL.lng };
  const r = await api('POST', '/api/rotas', { token: ctx.userToken, body });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.status_rota, 'iniciada');
  assert.equal(r.body.data.fonte_calculo, 'estimativa');
  assert.ok(r.body.data.distancia_km > 4);
  assert.match(r.body.data.link_navegacao, /^https:\/\/www\.google\.com\/maps\/dir\//);
  ctx.rotaId = r.body.data.id_rota;

  assert.equal((await api('POST', '/api/rotas', { token: ctx.userToken, body: { ...body, id_produto: 1 } })).status, 400);
  assert.equal((await api('POST', '/api/rotas', {
    token: ctx.userToken, body: { ...body, id_vendedor: ctx.novoVendedorId, id_produto: 1 }
  })).status, 400);
  assert.equal((await api('POST', '/api/rotas', { token: ctx.zeToken, body })).status, 403);

  const st = await api('PATCH', `/api/rotas/${ctx.rotaId}/status`, { token: ctx.userToken, body: { status: 'em_andamento' } });
  assert.equal(st.body.data.status_rota, 'em_andamento');

  // O vendedor de destino vê a rota; outro vendedor não
  assert.equal((await api('GET', `/api/rotas/${ctx.rotaId}`, { token: ctx.zeToken })).status, 200);
  assert.equal((await api('GET', `/api/rotas/${ctx.rotaId}`, { token: ctx.novoVendedorToken })).status, 404);
  const recebidas = await api('GET', '/api/vendedores/me/rotas?status=em_andamento', { token: ctx.zeToken });
  assert.equal(recebidas.body.pagination.total, 1);

  const lista = await api('GET', '/api/rotas', { token: ctx.userToken });
  assert.equal(lista.body.pagination.total, 1);

  // segunda rota, cancelada; transição inválida depois disso
  const r2 = await api('POST', '/api/rotas', { token: ctx.userToken, body: { ...body, modo_transporte: 'walking' } });
  ctx.rotaCanceladaId = r2.body.data.id_rota;
  assert.equal((await api('PATCH', `/api/rotas/${ctx.rotaCanceladaId}/status`, { token: ctx.userToken, body: { status: 'cancelada' } })).status, 200);
  assert.equal((await api('PATCH', `/api/rotas/${ctx.rotaCanceladaId}/status`, { token: ctx.userToken, body: { status: 'concluida' } })).status, 409);
});

test('avaliações e média do vendedor (triggers)', { skip }, async () => {
  const av = await api('POST', '/api/avaliacoes', {
    token: ctx.userToken, body: { id_vendedor: 2, id_rota: ctx.rotaId, nota: 4, comentario: 'Bom peixe' }
  });
  assert.equal(av.status, 201, JSON.stringify(av.body));
  const idAv = av.body.data.id_avaliacao;

  // trigger concluiu a rota
  const rota = await api('GET', `/api/rotas/${ctx.rotaId}`, { token: ctx.userToken });
  assert.equal(rota.body.data.status_rota, 'concluida');
  assert.ok(rota.body.data.data_chegada);

  let v = (await api('GET', '/api/vendedores/2')).body.data;
  assert.equal(v.avaliacao_media, 4);
  assert.equal(v.total_avaliacoes, 1);

  assert.equal((await api('POST', '/api/avaliacoes', {
    token: ctx.userToken, body: { id_vendedor: 2, id_rota: ctx.rotaId, nota: 5 }
  })).status, 409);
  assert.equal((await api('POST', '/api/avaliacoes', {
    token: ctx.userToken, body: { id_vendedor: 2, id_rota: ctx.rotaCanceladaId, nota: 5 }
  })).status, 400);
  assert.equal((await api('POST', '/api/avaliacoes', {
    token: ctx.userToken, body: { id_vendedor: 1, id_rota: ctx.rotaId, nota: 5 }
  })).status, 400);
  assert.equal((await api('POST', '/api/avaliacoes', { token: ctx.userToken, body: { id_vendedor: 2, nota: 7 } })).status, 400);

  // avaliação sem rota: apenas uma por vendedor
  const semRota = await api('POST', '/api/avaliacoes', { token: ctx.userToken, body: { id_vendedor: 2, nota: 2 } });
  assert.equal(semRota.status, 201);
  assert.equal((await api('POST', '/api/avaliacoes', { token: ctx.userToken, body: { id_vendedor: 2, nota: 2 } })).status, 409);
  v = (await api('GET', '/api/vendedores/2')).body.data;
  assert.equal(v.avaliacao_media, 3);
  assert.equal(v.total_avaliacoes, 2);

  const upd = await api('PUT', `/api/avaliacoes/${idAv}`, { token: ctx.userToken, body: { nota: 5 } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.comentario, 'Bom peixe');
  assert.equal((await api('GET', '/api/vendedores/2')).body.data.avaliacao_media, 3.5);

  const lista = await api('GET', '/api/vendedores/2/avaliacoes');
  assert.equal(lista.body.pagination.total, 2);
  assert.deepEqual(lista.body.resumo.distribuicao, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 });

  assert.equal((await api('GET', '/api/usuarios/me/avaliacoes', { token: ctx.userToken })).body.pagination.total, 2);

  // apagar recalcula a média (trigger DELETE)
  assert.equal((await api('DELETE', `/api/avaliacoes/${semRota.body.data.id_avaliacao}`, { token: ctx.userToken })).status, 200);
  v = (await api('GET', '/api/vendedores/2')).body.data;
  assert.equal(v.avaliacao_media, 5);
  assert.equal(v.total_avaliacoes, 1);

  // outro utilizador não pode editar/apagar
  const outro = await api('POST', '/api/usuarios/login', { body: { email: 'usuario@demo.co.mz', senha: 'senha123' } });
  assert.equal((await api('DELETE', `/api/avaliacoes/${idAv}`, { token: outro.body.data.token })).status, 404);
});

test('desativar conta invalida o token', { skip }, async () => {
  assert.equal((await api('DELETE', '/api/vendedores/me', { token: ctx.novoVendedorToken })).status, 200);
  assert.equal((await api('GET', '/api/vendedores/me', { token: ctx.novoVendedorToken })).status, 401);
  assert.equal((await api('GET', `/api/vendedores/${ctx.novoVendedorId}`)).status, 404);
  assert.equal((await api('POST', '/api/vendedores/login', { body: { email: 'nova@banca.mz', senha: 'segredo1' } })).status, 403);
});
