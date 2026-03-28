const { nodeEnv } = require('../config/env');

function log(level, message, meta = {}) {
  const entry = { ts: new Date().toISOString(), level, message, ...meta };
  if (nodeEnv === 'test') return; // suppress during tests
  console.log(JSON.stringify(entry));
}

module.exports = {
  info:  (msg, meta) => log('info', msg, meta),
  warn:  (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
