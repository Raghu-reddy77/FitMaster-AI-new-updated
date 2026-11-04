
/**
 * FitMaster AI – HTTP Server Initialization
 */

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const database = require('./config/database');

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  console.log('==============================================');
  console.log('       FitMaster AI – Backend Server');
  console.log('==============================================');

  try {
    console.log('[System]: Checking database connection...');
    await database.testConnection();
    console.log(`[Database]: Active driver - ${database.activeDriver}`);
  } catch (error) {
    console.error('[Database Error]:', error.message);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server]: Running on port ${PORT}`);
    console.log('==============================================');
  });

  const shutdown = (signal) => {
    console.log(`[Server]: Received ${signal}. Shutting down...`);

    server.close(async () => {
      try {
        const activePool = database.pool;

        if (typeof activePool.end === 'function') {
          await activePool.end();
        }

        console.log('[Server]: Shutdown complete.');
      } catch (error) {
        console.error('[Shutdown Error]:', error.message);
      }

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
