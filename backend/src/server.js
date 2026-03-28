require('dotenv').config();
const app     = require('./app');
const config  = require('./config/env');
const prisma  = require('./config/database');

async function start() {
  try {
    await prisma.$connect();
    app.listen(config.port, () => {
      console.log(`\n🚀  Scope 3 Supplier Portal API`);
      console.log(`    URL: http://localhost:${config.port}`);
      console.log(`    Env: ${config.nodeEnv}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
