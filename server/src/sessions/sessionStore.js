import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';
import { logEvent } from '../utils/logger.js';

/**
 * In-memory, short-lived processing sessions.
 * No database and no permanent storage: restarting the process discards everything.
 */
const sessions = new Map();
let sweepTimer = null;

export async function ensureTempRoot() {
  await fs.mkdir(config.tempRoot, { recursive: true, mode: 0o700 });
}

export async function createSession() {
  const id = randomUUID();
  const token = randomBytes(32).toString('hex');
  const directory = path.join(config.tempRoot, id);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });

  const createdMs = Date.now();
  const session = {
    id,
    token,
    directory,
    createdAt: new Date(createdMs).toISOString(),
    expiresAtMs: createdMs + config.sessionTtlSeconds * 1000,
    files: new Map(),
  };

  sessions.set(id, session);
  logEvent('info', 'SESSION_CREATED', { requestId: id, ttlSeconds: config.sessionTtlSeconds });
  return session;
}

export function getSessionById(sessionId, token) {
  const session = sessions.get(sessionId);

  if (!session) {
    throw ApiError.notFound('SESSION_NOT_FOUND', 'This session does not exist.');
  }

  if (session.expiresAtMs <= Date.now()) {
    void destroySessionById(sessionId);
    throw ApiError.notFound('SESSION_EXPIRED', 'This session has expired and its files were deleted.');
  }

  if (token !== session.token) {
    throw ApiError.unauthorized(
      'SESSION_TOKEN_MISMATCH',
      'The session token is not valid for this session.',
    );
  }

  return session;
}

export async function destroySessionById(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;

  sessions.delete(sessionId);
  await fs.rm(session.directory, { recursive: true, force: true });
  logEvent('info', 'SESSION_DESTROYED', { requestId: sessionId });
  return true;
}

export function startSessionSweeper() {
  if (sweepTimer) return;

  sweepTimer = setInterval(() => {
    const now = Date.now();
    let removed = 0;

    for (const [id, session] of sessions) {
      if (session.expiresAtMs <= now) {
        void destroySessionById(id);
        removed += 1;
      }
    }

    if (removed > 0) {
      logEvent('info', 'SESSION_SWEEP', { count: removed });
    }
  }, 60_000);
  sweepTimer.unref();
}

export async function destroyAllSessions() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }

  const ids = [...sessions.keys()];
  await Promise.all(ids.map((id) => destroySessionById(id)));
  if (ids.length > 0) {
    logEvent('info', 'SESSION_SHUTDOWN_CLEANUP', { count: ids.length });
  }
}
