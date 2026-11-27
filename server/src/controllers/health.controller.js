import { config } from '../config/index.js';
import { sendSuccess } from '../utils/response.js';

export function healthCheck(_req, res) {
  const commit =
    process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? process.env.COMMIT ?? null;

  return sendSuccess(res, {
    status: 'ok',
    service: 'resumeshield-api',
    version: config.version,
    commit,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
