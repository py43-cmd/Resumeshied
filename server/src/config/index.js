import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_TEMP_ROOT = path.join(os.tmpdir(), 'resumeshield');

function toPositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: expected a positive integer, received "${value}"`);
  }
  return parsed;
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toPositiveInteger(process.env.PORT ?? 4000, 'PORT'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  apiPrefix: '/api',
  jsonBodyLimit: '100kb',
  sessionTtlSeconds: toPositiveInteger(
    process.env.SESSION_TTL_SECONDS ?? 1800,
    'SESSION_TTL_SECONDS',
  ),
  maxUploadBytes: toPositiveInteger(
    process.env.MAX_UPLOAD_BYTES ?? 10485760,
    'MAX_UPLOAD_BYTES',
  ),
  tempRoot: process.env.TEMP_ROOT
    ? path.resolve(process.env.TEMP_ROOT)
    : DEFAULT_TEMP_ROOT,
  version: '0.1.0',
});

export function assertProductionConfig() {
  if (config.nodeEnv === 'production' && config.clientOrigin.includes('*')) {
    throw new Error('CLIENT_ORIGIN must be an exact origin in production (no wildcards).');
  }
}
