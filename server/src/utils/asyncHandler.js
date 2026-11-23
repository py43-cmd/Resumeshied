/**
 * Express 4 does not forward rejected promises to the error middleware.
 * Wrap every async controller so thrown ApiErrors reach errorHandler.
 */
export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
