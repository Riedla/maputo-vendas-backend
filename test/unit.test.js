const { test } = require('node:test');
const assert = require('node:assert/strict');

const v = require('../src/utils/validators');
const { splitSql } = require('../database/migrate');
const { buildSetClause, escapeLike } = require('../src/utils/sql');
const Rota = require('../src/models/Rota');
const Usuario = require('../src/models/Usuario');
const { estimarRota, linkNavegacao } = require('../src/services/rotaService');

test('isValidPhoneMZ aceita formatos moçambicanos e rejeita inválidos', () => {
  for (const ok of ['841234567', '+258841234567', '258 84 123 4567', '00258821234567', '87-123-4567']) {
    assert.ok(v.isValidPhoneMZ(ok), ok);
  }
  for (const bad of ['', '811234567', '88123456', '+25884123456', '21123456', null, 123]) {
    assert.ok(!v.isValidPhoneMZ(bad), String(bad));
  }
});

test('normalizePhoneMZ produz +258XXXXXXXXX', () => {
  assert.equal(v.normalizePhoneMZ('84 123 4567'), '+258841234567');
  assert.equal(v.normalizePhoneMZ('+258 84-123-4567'), '+258841234567');
});

test('haversineKm calcula distâncias conhecidas', () => {
  assert.equal(v.haversineKm(-25.9692, 32.5732, -25.9692, 32.5732), 0);
  // Mercado Central -> Mercado do Zimpeto ≈ 11.4 km em linha reta
  const d = v.haversineKm(-25.9692, 32.5732, -25.8697, 32.5617);
  assert.ok(d > 10.5 && d < 12, `distância ${d}`);
});

test('boundingBox contém pontos dentro do raio', () => {
  const box = v.boundingBox(-25.9692, 32.5732, 5);
  assert.ok(box.minLat < -25.9692 && box.maxLat > -25.9692);
  // ponto a ~4.9 km a norte
  assert.ok(-25.9692 + 4.9 / 111.32 < box.maxLat);
});

test('parsePagination aplica limites', () => {
  assert.deepEqual(v.parsePagination({}), { page: 1, limit: 10, offset: 0 });
  assert.deepEqual(v.parsePagination({ page: '3', limit: '500' }), { page: 3, limit: 100, offset: 200 });
  assert.deepEqual(v.parsePagination({ page: '-1', limit: 'abc' }), { page: 1, limit: 10, offset: 0 });
});

test('splitSql respeita DELIMITER e ignora comentários', () => {
  const sql = `-- comentário
CREATE TABLE a (id INT);
DELIMITER //
CREATE TRIGGER t AFTER INSERT ON a FOR EACH ROW
BEGIN
  UPDATE b SET x = 1;
END//
DELIMITER ;
INSERT INTO a VALUES (1);`;
  const stmts = splitSql(sql);
  assert.equal(stmts.length, 3);
  assert.match(stmts[1], /^CREATE TRIGGER[\s\S]*UPDATE b SET x = 1;\s*END$/);
  assert.equal(stmts[2], 'INSERT INTO a VALUES (1)');
});

test('buildSetClause só aceita colunas permitidas', () => {
  const r = buildSetClause({ nome: 'A', 'ativo = 1, nome': 'x', email: 'e', telefone: undefined }, ['nome', 'telefone']);
  assert.equal(r.clause, 'nome = ?');
  assert.deepEqual(r.values, ['A']);
});

test('escapeLike escapa curingas', () => {
  assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\');
});

test('Rota.podeTransitar segue a máquina de estados', () => {
  assert.ok(Rota.podeTransitar('iniciada', 'em_andamento'));
  assert.ok(Rota.podeTransitar('em_andamento', 'concluida'));
  assert.ok(!Rota.podeTransitar('concluida', 'cancelada'));
  assert.ok(!Rota.podeTransitar('cancelada', 'iniciada'));
});

test('Usuario.toJSON não expõe senha_hash', () => {
  const json = JSON.parse(JSON.stringify(new Usuario({ id_usuario: 1, nome: 'A', senha_hash: 'segredo', ativo: 1 })));
  assert.equal(json.senha_hash, undefined);
  assert.equal(json.ativo, true);
});

test('estimarRota e linkNavegacao', () => {
  const r = estimarRota({ lat: -25.9692, lng: 32.5732 }, { lat: -25.8697, lng: 32.5617 }, 'driving');
  assert.equal(r.fonte, 'estimativa');
  assert.ok(r.distancia_km > 13 && r.distancia_km < 16);
  assert.ok(r.tempo_estimado_min > 25 && r.tempo_estimado_min < 45);
  const walk = estimarRota({ lat: -25.9692, lng: 32.5732 }, { lat: -25.8697, lng: 32.5617 }, 'walking');
  assert.ok(walk.tempo_estimado_min > r.tempo_estimado_min);
  const link = linkNavegacao({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, 'walking');
  assert.match(link, /origin=1%2C2&destination=3%2C4&travelmode=walking/);
});
