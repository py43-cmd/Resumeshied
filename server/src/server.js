import app from './app.js';
import { assertProductionConfig, config } from './config/index.js';
import { logEvent } from './utils/logger.js';

assertProductionConfig();

const server = app.listen(config.port, () => {
  logEvent('info', 'SERVER_STARTED', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    ttlSeconds: config.sessionTtlSeconds,
  });
});

function shutdown(signal) {
  server.close(() => {
    logEvent('info', 'SERVER_STOPPED', { code: signal });
    process.exit(0);
  });

  setTimeout(() => {
    logEvent('error', 'FORCED_SHUTDOWN', { code: signal });
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
