// خدمة تسجيل الأحداث — تكتب في ملف + console
const fs = require('fs');
const path = require('path');
const config = require('../config/easyorders.config');
const logPath = path.join(process.cwd(), config.logFile);

function write(level, msg, meta) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(meta || {}) }) + '\n';
  try { fs.appendFileSync(logPath, line); } catch (e) { /* تجاهل فشل الكتابة */ }
  if (level === 'error') console.error('[EasyOrders]', msg, meta || '');
  else console.log('[EasyOrders]', msg);
}

module.exports = {
  info:  (m, meta) => write('info', m, meta),
  warn:  (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta)
};
