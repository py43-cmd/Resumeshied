/**
 * Every API response uses the same envelope so the frontend can unwrap it in
 * one place (client/src/lib/api.js later).
 */
export function sendSuccess(res, data, { status = 200, meta = {} } = {}) {
  return res.status(status).json({
    success: true,
    data,
    meta: { requestId: res.req.requestId, ...meta },
  });
}

export function sendError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  const body = {
    success: false,
    error: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: error.isOperational
        ? error.message
        : 'An unexpected error occurred.',
    },
    meta: { requestId: res.req.requestId },
  };

  if (error.details && status < 500) {
    body.error.details = error.details;
  }

  return res.status(status).json(body);
}
