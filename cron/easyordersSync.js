// مُجدوِل المزامنة التلقائية كل 10 دقائق — معزول ولا يعطّل السيرفر
const db = require('../services/db');
const logger = require('../services/logger');
const config = require('../config/easyorders.config');

let timer = null;
let running = false;

async function tick(syncProductsFn, syncStatusesFn) {
  if (running) return; // منع التداخل
  running = true;
  try {
    const rows = db.getDb().prepare(
      "SELECT marketer_id FROM easyorders_connections WHERE connection_status = 'connected' AND api_key_enc IS NOT NULL"
    ).all();
    for (const row of rows) {
      try { if (syncProductsFn) await syncProductsFn(row.marketer_id); }
      catch (e) { logger.warn('Cron products sync failed', { marketerId: row.marketer_id, error: e.message }); }
      try { if (syncStatusesFn) await syncStatusesFn(row.marketer_id); }
      catch (e) { logger.warn('Cron status sync failed', { marketerId: row.marketer_id, error: e.message }); }
    }
    if (rows.length) logger.info('Cron sync tick done', { marketers: rows.length });
  } catch (e) {
    logger.error('Cron tick error', { error: e.message });
  } finally {
    running = false;
  }
}

function start(syncProductsFn, syncStatusesFn) {
  if (timer) return;
  logger.info('Cron scheduled', { intervalMs: config.syncIntervalMs });
  timer = setInterval(function () { tick(syncProductsFn, syncStatusesFn); }, config.syncIntervalMs);
  if (timer.unref) timer.unref();
}

function stop() { if (timer) { clearInterval(timer); timer = null; } }

module.exports = { start: start, stop: stop, tick: tick };
