import { config } from '../config/index.js';
import { sendSuccess } from '../utils/response.js';

export function healthCheck(_req, res) {
  return sendSuccess(res, {
    status: 'ok',
    service: 'resumeshield-api',
    version: config.version,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
