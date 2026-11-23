import { config } from '../config/index.js';

const LEVEL_WEIGHT = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Allowlist: a log call can never accidentally include file names, resume text,
 * detection values, emails or phone numbers, because those keys are dropped.
 */
const ALLOWED_META_KEYS = [
  'requestId',
  'status',
  'method',
  'path',
  'durationMs',
  'code',
  'port',
  'nodeEnv',
  'ttlSeconds',
];

function safeMeta(meta) {
  const safe = {};
  for (const key of ALLOWED_META_KEYS) {
    if (meta[key] !== undefined) safe[key] = meta[key];
  }
  return safe;
}

export function logEvent(level, event, meta = {}) {
  const weight = LEVEL_WEIGHT[level] ?? LEVEL_WEIGHT.info;
  const threshold = LEVEL_WEIGHT[config.logLevel] ?? LEVEL_WEIGHT.info;
  if (weight < threshold) return;

  const entry = {
    time: new Date().toISOString(),
    level,
    event,
    ...safeMeta(meta),
  };

  process.stdout.write(`${JSON.stringify(entry)}\n`);
}
