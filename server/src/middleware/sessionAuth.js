import { getSessionById } from '../sessions/sessionStore.js';
import { ApiError } from '../utils/ApiError.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireSession(req, _res, next) {
  const token = req.get('X-Session-Token');
  if (!token) {
    return next(
      ApiError.unauthorized(
        'SESSION_TOKEN_REQUIRED',
        'A valid X-Session-Token header is required.',
      ),
    );
  }

  if (!UUID_PATTERN.test(req.params.sessionId)) {
    return next(ApiError.notFound('SESSION_NOT_FOUND', 'This session does not exist.'));
  }

  try {
    req.session = getSessionById(req.params.sessionId, token);
    return next();
  } catch (error) {
    return next(error);
  }
}
