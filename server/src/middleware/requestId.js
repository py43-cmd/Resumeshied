import { randomUUID } from 'node:crypto';

const SAFE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  req.requestId =
    incoming && SAFE_ID_PATTERN.test(incoming) ? incoming : randomUUID();

  res.setHeader('X-Request-Id', req.requestId);
  next();
}
