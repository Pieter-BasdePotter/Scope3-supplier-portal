require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  tokenExpiryHours: parseInt(process.env.TOKEN_EXPIRY_HOURS ?? '72', 10),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  // Mock customer credentials (prototype only — replace with real auth in Massure)
  mockCustomer: {
    email: 'admin@massure.test',
    password: 'admin123',
    name: 'Massure Admin',
  },
};

// Crash fast in production if insecure default secret is used
if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-change-me') {
  console.error('FATAL: JWT_SECRET environment variable must be set in production.');
  process.exit(1);
}

module.exports = config;
