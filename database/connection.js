const mysql = require('mysql2/promise');
const dbConfig = require('../src/config/database');
const logger = require('../src/utils/logger');

let pool = null;

async function connectDatabase() {
  if (pool) return pool;
  pool = mysql.createPool(dbConfig);
  // Valida a ligação logo no arranque
  const conn = await pool.getConnection();
  conn.release();
  logger.info(`Ligado ao MariaDB/MySQL em ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Ligação à base de dados não estabelecida');
  }
  return pool;
}

/**
 * Executa uma query. Usa `query` (e não `execute`) para que LIMIT/OFFSET
 * com placeholders funcionem tanto em MariaDB como em MySQL 8.
 * Aceita um executor opcional (ligação de uma transação).
 */
async function executeQuery(sql, params = [], executor = null) {
  try {
    const [rows] = await (executor || getPool()).query(sql, params);
    return rows;
  } catch (error) {
    logger.error('Erro ao executar query', { sql, error: error.message });
    throw error;
  }
}

/**
 * Executa `fn(conn)` dentro de uma transação, com commit/rollback automáticos.
 */
async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  connectDatabase,
  getPool,
  executeQuery,
  withTransaction,
  closeDatabase
};
