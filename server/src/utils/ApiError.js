/**
 * Operational errors carry an HTTP status and a stable machine-readable code.
 * Unexpected errors are deliberately not ApiError instances.
 */
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(code, message, details) {
    return new ApiError({ status: 400, code, message, details });
  }

  static unauthorized(code, message) {
    return new ApiError({ status: 401, code, message });
  }

  static forbidden(code, message) {
    return new ApiError({ status: 403, code, message });
  }

  static notFound(code, message) {
    return new ApiError({ status: 404, code, message });
  }

  static payloadTooLarge(code, message) {
    return new ApiError({ status: 413, code, message });
  }

  static unsupportedMediaType(code, message) {
    return new ApiError({ status: 415, code, message });
  }

  static unprocessable(code, message, details) {
    return new ApiError({ status: 422, code, message, details });
  }

  static tooManyRequests(code, message) {
    return new ApiError({ status: 429, code, message });
  }

  static internal(code, message) {
    return new ApiError({ status: 500, code, message });
  }
}
