import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/response.js';
import { logEvent } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  return sendError(
    res,
    ApiError.notFound(
      'ROUTE_NOT_FOUND',
      `Route ${req.method} ${req.path} does not exist.`,
    ),
  );
}

export function errorHandler(err, req, res, _next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (err?.type === 'entity.too.large') {
      error = ApiError.payloadTooLarge(
        'REQUEST_BODY_TOO_LARGE',
        'Request body is too large.',
      );
    } else if (err instanceof SyntaxError && 'body' in err) {
      error = ApiError.badRequest(
        'INVALID_JSON',
        'Request body must be valid JSON.',
      );
    } else {
      // Never log stacks, request bodies or error messages that could contain PII.
      logEvent('error', 'UNHANDLED_ERROR', {
        requestId: req.requestId,
        code: err?.code,
      });
      error = ApiError.internal(
        'INTERNAL_ERROR',
        'An unexpected error occurred.',
      );
    }
  }

  logEvent(error.status >= 500 ? 'error' : 'warn', 'API_RESULT', {
    requestId: req.requestId,
    status: error.status,
    code: error.code,
    method: req.method,
    path: req.path,
  });

  return sendError(res, error);
}
