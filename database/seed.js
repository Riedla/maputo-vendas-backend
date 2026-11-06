/**
 * Insere os dados iniciais (database/seeds/*.sql).
 * Regista os seeds aplicados em _SEEDS para não duplicar dados.
 */
require('dotenv').config();
const path = require('path');
const mysql = require('mysql2/promise');
const dbConfig = require('../src/config/database');
const { runSqlDir } = require('./migrate');

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    console.log(`A aplicar seeds em "${dbConfig.database}"...`);
    const n = await runSqlDir(conn, path.join(__dirname, 'seeds'), '_SEEDS');
    console.log(`Concluído: ${n} seed(s) aplicado(s).`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
