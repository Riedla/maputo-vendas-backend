require('dotenv').config();

module.exports = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_vendedores',
  charset: 'utf8mb4',
  timezone: 'Z',
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  queueLimit: 0,
  // DECIMAL como número em vez de string
  decimalNumbers: true
};
