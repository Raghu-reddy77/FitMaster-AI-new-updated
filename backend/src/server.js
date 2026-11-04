/**
 * FitMaster AI – HTTP Server Initialization
 */

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  console.log('==============================================');
  console.log('       FitMaster AI – Backend Server');
  console.log('==============================================');

  // Verify database connection
  try {
    console.log('[System]: Checking database connection...');
    const isDbConnected = await testConnection();

    if (!isDbConnected) {
      console.warn('[Warning]: Database connection was unsuccessful.');
    } else {
      console.log('[Database]: Connection successful.');
    }
  } catch (err) {
    console.error('[Database Error]:', err.message);
  }

  // Render requires the server to listen on 0.0.0.0
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server]: Running on port ${PORT}`);
    console.log('==============================================');
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`[Server]: Received ${signal}. Shutting down...`);

    server.close(() => {
      console.log('[Server]: HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };