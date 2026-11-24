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

function parseOrigins(value, name) {
  if (value === undefined) return null;

  const entries = String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error(`Invalid ${name}: expected one or more comma-separated origins.`);
  }
  return entries;
}

// CLIENT_ORIGINS is the new list form; CLIENT_ORIGIN stays supported as a
// single-origin fallback for existing deployments.
const configuredOrigins =
  parseOrigins(process.env.CLIENT_ORIGINS, 'CLIENT_ORIGINS') ??
  parseOrigins(process.env.CLIENT_ORIGIN, 'CLIENT_ORIGIN') ??
  ['http://localhost:5173'];

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toPositiveInteger(process.env.PORT ?? 4000, 'PORT'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  clientOrigins: Object.freeze(configuredOrigins),
  // Backwards-compatible alias for the first configured origin.
  clientOrigin: configuredOrigins[0],
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

function assertExactOrigin(origin) {
  if (origin.includes('*')) {
    throw new Error(`CORS origin must be exact in production (no wildcards); received "${origin}".`);
  }
  if (origin.endsWith('/')) {
    throw new Error(`CORS origin must not have a trailing slash; received "${origin}".`);
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`CORS origin is not a valid URL; received "${origin}".`);
  }

  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (!['http:', 'https:'].includes(parsed.protocol) || (parsed.protocol === 'http:' && !isLocal)) {
    throw new Error(`CORS origin must use https in production (http is allowed only for localhost); received "${origin}".`);
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error(`CORS origin must be a bare origin with no path, query, or credentials; received "${origin}".`);
  }
  if (parsed.origin !== origin) {
    throw new Error(`CORS origin must be normalized; use "${parsed.origin}" instead of "${origin}".`);
  }
}

export function assertProductionConfig() {
  if (config.nodeEnv !== 'production') return;

  for (const origin of config.clientOrigins) {
    assertExactOrigin(origin);
  }
}
