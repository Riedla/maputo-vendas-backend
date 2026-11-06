require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');
const { connectDatabase, closeDatabase } = require('./database/connection');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function createApp() {
  const app = express();

  // Necessário atrás de proxy/load balancer para o rate limit usar o IP real
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
  }

  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: corsOrigins.includes('*') ? true : corsOrigins, credentials: true }));
  app.use(rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Muitas tentativas. Tente novamente em alguns minutos.' }
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Log de pedidos (com duração e código de resposta)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms - IP: ${req.ip}`);
    });
    next();
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Sistema Vendedores API'
    });
  });

  app.use('/api', routes);

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint não encontrado' });
  });

  app.use(errorHandler);
  return app;
}

function checkEnv() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não definido. Copie .env.example para .env e configure-o.');
  }
  if (isProduction && process.env.JWT_SECRET.length < 32) {
    throw new Error('Em produção, JWT_SECRET deve ter pelo menos 32 caracteres.');
  }
}

async function startServer() {
  try {
    checkEnv();
    await connectDatabase();

    const server = createApp().listen(PORT, () => {
      logger.info(`Servidor a correr na porta ${PORT} (ambiente: ${process.env.NODE_ENV || 'development'})`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} recebido. A encerrar o servidor...`);
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
      // Força a saída se as ligações não fecharem a tempo
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error(`Erro ao iniciar servidor: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp };
