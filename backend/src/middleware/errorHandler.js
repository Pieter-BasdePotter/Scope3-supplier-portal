const logger = require('../utils/logger');

/**
 * Centralised error handler.
 * Must be registered AFTER all routes: app.use(errorHandler).
 */
function errorHandler(err, req, res, _next) {
  let status  = err.status ?? 500;
  let message = err.message ?? 'Internal server error';

  // Map Multer errors to appropriate HTTP status codes
  if (err.name === 'MulterError') {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        status  = 413;
        message = `File too large. Maximum allowed size is 10MB.`;
        break;
      case 'LIMIT_FILE_COUNT':
        status  = 400;
        message = 'Too many files. Maximum 10 files per submission.';
        break;
      default:
        status  = 400;
        message = `File upload error: ${err.message}`;
    }
  }

  // File type rejection from fileFilter
  if (err.code === 'INVALID_FILE_TYPE') status = 415;

  if (status >= 500) {
    logger.error('Unhandled error', { url: req.originalUrl, err: err.message, stack: err.stack });
  }

  res.status(status).json({
    error: message,
    ...(err.code   ? { code:   err.code   } : {}),
    ...(err.errors ? { errors: err.errors } : {}),
  });
}

module.exports = { errorHandler };
