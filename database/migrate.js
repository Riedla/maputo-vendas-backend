/**
 * Executa as migrações SQL em database/migrations por ordem alfabética.
 * Cria a base de dados se não existir e regista as migrações aplicadas
 * na tabela _MIGRACOES. Suporta blocos com DELIMITER (triggers).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dbConfig = require('../src/config/database');

/** Divide um ficheiro SQL em instruções, respeitando DELIMITER. */
function splitSql(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();
    const delimMatch = trimmed.match(/^DELIMITER\s+(\S+)$/i);
    if (delimMatch) {
      delimiter = delimMatch[1];
      continue;
    }
    if (!buffer && (trimmed === '' || trimmed.startsWith('--'))) continue;

    buffer += line + '\n';
    if (trimmed.endsWith(delimiter)) {
      const stmt = buffer.trim().slice(0, -delimiter.length).trim();
      if (stmt) statements.push(stmt);
      buffer = '';
    }
  }
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

async function runSqlDir(conn, dir, trackingTable) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS ${trackingTable} (
      nome VARCHAR(255) PRIMARY KEY,
      aplicada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  const [done] = await conn.query(`SELECT nome FROM ${trackingTable}`);
  const applied = new Set(done.map((r) => r.nome));

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ↷ ${file} (já aplicada)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const stmt of splitSql(sql)) {
      await conn.query(stmt);
    }
    await conn.query(`INSERT INTO ${trackingTable} (nome) VALUES (?)`, [file]);
    console.log(`  ✔ ${file}`);
    count++;
  }
  return count;
}

async function main() {
  const { database, ...serverConfig } = dbConfig;
  const conn = await mysql.createConnection({ ...serverConfig, multipleStatements: false });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.changeUser({ database });
    console.log(`A aplicar migrações em "${database}"...`);
    const n = await runSqlDir(conn, path.join(__dirname, 'migrations'), '_MIGRACOES');
    console.log(`Concluído: ${n} migração(ões) aplicada(s).`);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Erro na migração:', err.message);
    process.exit(1);
  });
}

module.exports = { splitSql, runSqlDir };
