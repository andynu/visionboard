// Centralized error handling middleware for Express

// Custom error class for API errors
class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'APIError';
  }
}

// Not Found error helper
function notFound(message = 'Resource not found') {
  return new APIError(message, 404);
}

// Bad Request error helper
function badRequest(message = 'Invalid request') {
  return new APIError(message, 400);
}

// Error handler middleware - must be registered last
function errorHandler(err, req, res, next) {
  // Log error for debugging (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    if (err.stack && process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Build error response
  const response = {
    error: err.message || 'Internal server error',
  };

  // Include details if available (for validation errors, etc.)
  if (err.details) {
    response.details = err.details;
  }

  // Don't expose internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    response.error = 'Internal server error';
  }

  res.status(statusCode).json(response);
}

// Async handler wrapper - catches promise rejections and passes to error handler
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  APIError,
  notFound,
  badRequest,
  errorHandler,
  asyncHandler,
};
