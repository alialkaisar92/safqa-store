const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const store = require('./firestore');
const postgres = require('./lib/postgres');

const BASE_URL = process.env.SAFKA_PUBLIC_BASE_URL || 'https://api.safka-eg.com/api/v1/public';
const CACHE_FILE = path.join(__dirname, 'products-cache.json');
const META_DOC = 'safkaSync';

function apiKey() { return String(process.env.SAFKA_API_KEY || '').trim(); }
function headers() { return { 'api-safka-key': apiKey(), 'Content-Type': 'application/json' }; }
function mapStatus(value) {
  const s = String(value || '').trim().toLowerCase();
  const map = {
    pending: 'قيد التأكيد', accepted: 'قيد التأكيد', processing: 'جاري التجهيز', preparing: 'جاري التجهيز', shipped: 'تم الشحن', confirmed: 'تم التأكيد', delivered: 'تم التسليم', completed: 'تم التسليم', cancelled: 'ملغي', canceled: 'ملغي', returned: 'مرتجع', rejected: 'مرفوض', failed: 'فشل'
  };
  return map[s] || String(value || 'قيد المتابعة');
}
async function requestJson(url, options, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 10000));
  try {
    const response = await fetch(url, Object.assign({ headers: headers(), signal: controller.signal }, options || {}));
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error((body.errors || []).map(e => e && (e.msg || e.message || e.error)).filter(Boolean).join(', ') || ('Safka HTTP ' + response.status));
      error.httpStatus = response.status;
      error.body = body;
      throw error;
    }
    return body;
  } catch (error) {
    if (error && error.name === 'AbortError') { error.code = 'ETIMEDOUT'; error.message = 'supplier timeout'; }
    throw error;
  } finally { clearTimeout(timer); }
}
async function getMeta() {
  const rows = await store.all('affiliateMeta');
  const row = rows.find(item => String(item.id) === META_DOC);
  return row || {};
}
async function saveMeta(value) { await store.saveDoc('affiliateMeta', META_DOC, value); }
async function fetchAllProducts() {
  if (!apiKey()) throw new Error('SAFKA_API_KEY غير مضبوط');
  const all = []; let page = 1; let pages = 1;
  while (page <= pages && page <= 100) {
    const data = await requestJson(BASE_URL + '/products?page=' + page + '&size=100');
    const rows = data.data || data.items || (Array.isArray(data) ? data : []);
    if (!rows.length) break;
    all.push(...rows);
    pages = Number(data.pages || pages);
    page++;
  }
  return all;
}
async function notifyAll(title, body, type, eventKey) {
  if (global.notifyBroadcast) { await global.notifyBroadcast({ title, body, url: '/store', type, eventKey: eventKey || type + ':' + body }); return; }
  if (!global.notifyUser) return;
  const users = await store.getUsers();
  await Promise.all(users.filter(u => u && u.id).map(u => global.notifyUser(u.id, title, body, '/store', type, eventKey || type + ':' + body).catch(() => null)));
}
async function notifyOrderChange(job, status, message) {
  if (!global.notifyUser || !job || job.user_id == null) return;
  const orderId = String(job.order_id || job.request_key || '').trim();
  if (!orderId) return;
  await Promise.resolve(global.notifyUser(job.user_id, 'تحديث طلبك', message, '/store', 'order-status', 'order-status:' + orderId + ':' + String(status || 'updated'))).catch(error => console.warn('[notifications] order status skipped:', error.message));
}
function productStock(product) {
  const prop = (product && product.properties && product.properties[0]) || {};
  const inventory = product && product.inventory;
  const candidates = [
    prop.stock, prop.quantity, prop.available_qty, prop.availableQuantity,
    product && product.stock, product && product.quantity, product && product.available_qty,
    product && product.availableQuantity, product && product.inventory_quantity,
    inventory && inventory.stock, inventory && inventory.quantity, inventory && inventory.available,
    inventory && inventory.available_qty
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) return Math.max(0, Math.floor(Number(value)));
  }
  return null;
}

function sourceAvailable(product) {
  if (!product || product.is_active === false) return false;
  if (typeof product.is_available === 'boolean') return product.is_available;
  const props = Array.isArray(product.properties) ? product.properties : [];
  const flags = props.map(item => item && item.is_available).filter(value => typeof value === 'boolean');
  return flags.some(Boolean);
}

function wholesalePriceOf(value) {
  const raw = value || {};
  const candidates = [raw.rawWholesalePrice, raw.sale_price, raw.basePrice, raw.base_price, raw.wholesalePrice, raw.wholesale_price, raw.cost];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '' && Number.isFinite(Number(candidate))) return Math.max(0, Number(candidate));
  }
  return 0;
}
function dbProduct(product) {
  const stock = productStock(product);
  const base = wholesalePriceOf(product);
  return Object.assign({}, product, {
    external_id: product.id || product._id,
    stock,
    active: product.is_active !== false,
    basePrice: Number.isFinite(base) ? base : 0,
    available: sourceAvailable(product)
  });
}

async function syncProducts(options) {
  const products = await fetchAllProducts();
  const meta = await getMeta();
  const initialized = Array.isArray(meta.productIds);
  const previous = new Set((meta.productIds || []).map(String));
  const newProducts = initialized ? products.filter(p => p && p._id && !previous.has(String(p._id)) && p.is_active !== false) : [];
  const prepared = products.map(dbProduct);
  console.log('[availability-sync] sample:', JSON.stringify(products.slice(0, 5).map(product => ({
    id: product && (product.id || product._id),
    name: product && (product.name || product.title),
    is_available: product && product.is_available,
    propertyAvailability: Array.isArray(product && product.properties) ? product.properties.slice(0, 5).map(item => item && item.is_available) : [],
    available: prepared.find(item => String(item.external_id) === String(product && (product.id || product._id)))?.available === true
  }))));
  let database = null;
  try { database = await postgres.upsertProducts(prepared); }
  catch (e) { console.warn('Safka PostgreSQL stock import skipped:', e.message); }
  const missingStock = prepared.filter(product => product.stock === null);
  if (missingStock.length) console.warn('[stock-sync] Missing explicit stock field for ' + missingStock.length + ' products; stored as unavailable instead of using a guessed quantity. Sample IDs: ' + missingStock.slice(0, 5).map(product => String(product.external_id || '')).join(', '));
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(prepared)); } catch (e) { console.warn('Safka cache write skipped:', e.message); }
  await saveMeta({ productIds: products.map(p => String(p._id || p.id)).filter(Boolean), productCount: products.length, productsSyncedAt: new Date().toISOString(), stockImportedAt: new Date().toISOString(), stockImported: database || { inserted: 0, updated: 0 } });
  if (newProducts.length && options && options.notify !== false) {
    await notifyAll('منتجات جديدة على rab7na', 'تمت إضافة ' + newProducts.length + ' منتج جديد متاح للتسويق.', 'new-product', 'new-products:' + products.map(p => String(p && (p._id || p.id) || '')).filter(Boolean).sort().join(',').slice(-1800));
  }
  return { ok: true, products: products.length, newProducts: newProducts.length, stockImported: database || { inserted: 0, updated: 0 } };
}
function statusUrl(order) {
  const template = String(process.env.SAFKA_ORDER_STATUS_URL || '').trim();
  if (!template) return '';
  const id = encodeURIComponent(String(order.externalId || order.serial || order.id || ''));
  return template.replace(/\{id\}|:id/g, id);
}
function supplierOrderRecord(payload) {
  const candidates = [payload && payload.data, payload && payload.order, payload];
  return candidates.find(value => value && typeof value === 'object' && !Array.isArray(value) && (value._id || value.id || value.serial_number || value.serial || value.status || value.order_status)) || null;
}
function supplierStatus(payload, record) { return String((record && (record.status || record.order_status)) || (payload && (payload.status || payload.order_status)) || '').trim(); }
function supplierErrors(payload) {
  const out = [];
  [payload && payload.errors, payload && payload.data && payload.data.errors, payload && payload.order && payload.order.errors].forEach(list => {
    if (!Array.isArray(list)) return;
    list.forEach(item => { const value = typeof item === 'object' ? (item.msg || item.message || item.error || item.detail) : item; if (value && !out.includes(String(value))) out.push(String(value)); });
  });
  return out;
}
function supplierOutcome(response, payload) {
  const record = supplierOrderRecord(payload);
  const rawStatus = supplierStatus(payload, record);
  const errors = supplierErrors(payload);
  const externalId = record && (record._id || record.id || record.serial_number || record.serial);
  const nested = (payload && payload.data && typeof payload.data === 'object' ? payload.data : null) || (payload && payload.order && typeof payload.order === 'object' ? payload.order : null) || {};
  const falseFlag = [payload && payload.success, payload && payload.ok, nested.success, nested.ok].some(value => value === false || String(value).toLowerCase() === 'false');
  const terminalFailure = ['failed', 'rejected', 'cancelled', 'canceled', 'مرفوض', 'ملغي', 'ملغى', 'فشل'].includes(String(rawStatus || '').toLowerCase());
  return { accepted: Boolean(response && response.ok) && !falseFlag && !terminalFailure && !errors.length && Boolean(externalId), indeterminate: Boolean(response && response.ok) && !falseFlag && !terminalFailure && !errors.length && !externalId, record, rawStatus, externalId: externalId ? String(externalId) : '', errors };
}
function retryableStatus(status) { return [500, 502, 503, 504].includes(Number(status)); }
function maxAttempts() { return Math.max(1, Math.min(20, Number(process.env.ORDER_QUEUE_MAX_ATTEMPTS) || 5)); }
function retryDelayMs(attempt) { return [60000, 120000, 300000, 600000, 1800000][Math.max(0, Math.min(4, Number(attempt) - 1))]; }
async function recordAttempt(job, attempt, details) {
  if (!postgres.recordAffiliateOrderAttempt) return;
  try { await postgres.recordAffiliateOrderAttempt(Object.assign({ requestKey: job.request_key, orderId: job.order_id, attemptNumber: attempt }, details || {})); }
  catch (error) { console.warn('[order-queue] attempt_log_failed', { order_id: job.order_id, attempt_number: attempt, error: error.message }); }
}
function safeFailureMessage(status, error) {
  const source = String(error || '').toLowerCase();
  if (source.includes('محظور') || source.includes('سلوكه') || source.includes('blocked')) return 'تعذر تأكيد الطلب لأن رقم العميل غير مقبول لدى المورد';
  if (Number(status) >= 400 && Number(status) < 500) return 'بيانات الطلب غير مقبولة لدى المورد؛ راجع بيانات العميل وحاول بطلب جديد';
  return 'تعذر تأكيد الطلب من المورد حاليًا';
}
async function postSupplierOrder(job) {
  const data = job && job.request_data || {};
  const payload = data.supplierPayload;
  if (!payload || !Array.isArray(payload.items) || !payload.items.length) {
    const error = new Error('supplier payload missing'); error.code = 'INVALID_QUEUE_PAYLOAD'; error.supplierContacted = false; throw error;
  }
  const controller = new AbortController();
  const timeout = Math.max(3000, Number(process.env.SAFKA_ORDER_TIMEOUT_MS) || 12000);
  const timer = setTimeout(() => controller.abort(), timeout);
  let supplierContacted = false;
  try {
    supplierContacted = true;
    const response = await fetch(BASE_URL + '/orders', {
      method: 'POST',
      headers: Object.assign({}, headers(), { Accept: 'application/json', 'X-Idempotency-Key': String(job.request_key) }),
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    const outcome = supplierOutcome(response, body);
    return { response, body, outcome, supplierContacted: true };
  } catch (error) {
    if (error && error.name === 'AbortError') { error.code = 'ETIMEDOUT'; error.message = 'supplier timeout'; }
    if (error && error.supplierContacted == null) error.supplierContacted = supplierContacted;
    throw error;
  } finally { clearTimeout(timer); }
}

async function processAffiliateOrderJob(job) {
  const key = String(job.request_key || '');
  const attempt = Number(job.retry_count || 1);
  const data = job.request_data || {};
  const affiliateOrder = Object.assign({}, data.affiliateOrder || {});
  const startedAt = Date.now();
  let attemptLog = { requestStatus: 'processing' };
  console.log('[order-queue] supplier_request_started', { order_id: job.order_id, user_id: job.user_id, idempotency_key: key, attempt_number: attempt });
  try {
    const result = await postSupplierOrder(job);
    const outcome = result.outcome;
    if (outcome.accepted) {
      const displayStatus = ['pending', 'processing', 'قيد التأكيد', 'جاري التجهيز'].includes(String(outcome.rawStatus).toLowerCase()) ? 'قيد التأكيد' : (outcome.rawStatus ? mapStatus(outcome.rawStatus) : 'تم التأكيد');
      const savedOrder = Object.assign({}, affiliateOrder, {
        externalId: outcome.externalId,
        supplierOrderId: outcome.externalId,
        serial: (outcome.record && (outcome.record.serial_number || outcome.record.serial)) || outcome.externalId,
        external: outcome.record,
        status: displayStatus,
        requestStatus: 'accepted',
        supplierAcceptedAt: new Date().toISOString(),
        statusSyncedAt: new Date().toISOString()
      });
      let trackingSaved = true;
      try { await postgres.saveAffiliateOrder(savedOrder); }
      catch (error) { trackingSaved = false; console.error('[order-queue] affiliate tracking save failed', { order_id: job.order_id, error: error.message }); }
      if (trackingSaved && ['تم التأكيد', 'تم التاكيد', 'confirmed', 'تم التسليم', 'تم التوصيل', 'delivered', 'completed'].includes(String(displayStatus).toLowerCase())) {
        try { await postgres.updateAffiliateOrderStatus(savedOrder.id, { status: displayStatus, requestStatus: 'confirmed', supplierConfirmedAt: new Date().toISOString() }); }
        catch (error) { console.error('[order-queue] commission/status update failed', { order_id: job.order_id, error: error.message }); }
      }
      const supplierResponse = { order: outcome.record, affiliateOrder: savedOrder, status: outcome.rawStatus || null, httpStatus: result.response.status };
      const queueState = ['تم التأكيد', 'تم التاكيد', 'confirmed', 'تم التسليم', 'تم التوصيل', 'delivered', 'completed'].includes(String(displayStatus).toLowerCase()) ? 'confirmed' : (trackingSaved ? 'accepted' : 'accepted_untracked');
      attemptLog = { requestStatus: queueState, httpStatus: result.response.status, supplierStatus: outcome.rawStatus || null, supplierContacted: true };
      await postgres.updateAffiliateOrderQueueState(key, queueState, { supplierResponse, supplierOrderId: outcome.externalId, failureReason: trackingSaved ? null : 'تعذر حفظ سجل المتابعة بعد قبول المورد' });
      await notifyOrderChange(job, queueState, queueState === 'confirmed' ? 'تم تأكيد الطلب بنجاح.' : 'تم قبول الطلب وبدأت متابعته مع المورد.');
      console.log('[order-queue] order_accepted', { order_id: job.order_id, user_id: job.user_id, idempotency_key: key, supplier_order_id: outcome.externalId, attempt_number: attempt });
      return { status: 'accepted', supplierOrderId: outcome.externalId };
    }
    if (outcome.indeterminate) {
      const message = 'تم استلام رد غير مكتمل من المورد، وجارٍ التحقق من حالة الطلب؛ لا تعيد إرساله مرة أخرى';
      attemptLog = { requestStatus: 'unknown', httpStatus: result.response.status, supplierStatus: outcome.rawStatus || null, errorMessage: message, supplierContacted: true };
      await postgres.updateAffiliateOrderQueueState(key, 'unknown', { supplierResponse: { httpStatus: result.response.status }, failureReason: message });
      await postgres.updateAffiliateOrder(job.order_id, { status: 'قيد التحقق', requestStatus: 'unknown', failureReason: message, statusSyncedAt: new Date().toISOString() });
      await notifyOrderChange(job, 'unknown', message);
      console.warn('[order-queue] order_unknown', { order_id: job.order_id, user_id: job.user_id, idempotency_key: key, attempt_number: attempt, reason: 'incomplete_supplier_response' });
      return { status: 'unknown' };
    }
    const message = safeFailureMessage(result.response.status, result.body && (result.body.message || result.body.error || outcome.errors.join('، ')));
    if (retryableStatus(result.response.status)) {
      const unknownMessage = 'وصل رد خطأ من المورد بعد بدء الاتصال؛ جارٍ التحقق من حالة الطلب، لا تعيد إرساله مرة أخرى';
      attemptLog = { requestStatus: 'unknown', httpStatus: result.response.status, errorMessage: unknownMessage, supplierContacted: true };
      await postgres.updateAffiliateOrderQueueState(key, 'unknown', { supplierResponse: { httpStatus: result.response.status }, failureReason: unknownMessage });
      await postgres.updateAffiliateOrder(job.order_id, { status: 'قيد التحقق', requestStatus: 'unknown', failureReason: unknownMessage, statusSyncedAt: new Date().toISOString() });
      await notifyOrderChange(job, 'unknown', unknownMessage);
      console.warn('[order-queue] order_unknown', { order_id: job.order_id, user_id: job.user_id, idempotency_key: key, attempt_number: attempt, http_status: result.response.status });
      return { status: 'unknown' };
    }
    attemptLog = { requestStatus: 'failed', httpStatus: result.response.status, errorMessage: message, supplierContacted: true };
    await postgres.updateAffiliateOrderQueueState(key, 'failed', { supplierResponse: { httpStatus: result.response.status, errors: outcome.errors }, failureReason: message });
    await postgres.updateAffiliateOrder(job.order_id, { status: 'فشل', requestStatus: 'failed', failureReason: message, statusSyncedAt: new Date().toISOString() });
    await notifyOrderChange(job, 'failed', message);
    console.warn('[order-queue] order_failed', { order_id: job.order_id, user_id: job.user_id, idempotency_key: key, attempt_number: attempt, http_status: result.response.status });
    return { status: 'failed' };
  } catch (error) {
    const supplierContacted = !(error && error.supplierContacted === false);
    if (error && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.name === 'FetchError')) {
      const message = 'تم استلام الطلب، وجارٍ التحقق من حالة المورد؛ لا تعيد إرساله مرة أخرى';
      attemptLog = { requestStatus: 'unknown', errorMessage: message, supplierContacted };
      await postgres.updateAffiliateOrderQueueState(key, 'unknown', { failureReason: message });
      await postgres.updateAffiliateOrder(job.order_id, { status: 'قيد التحقق', requestStatus: 'unknown', failureReason: message, statusSyncedAt: new Date().toISOString() });
      await notifyOrderChange(job, 'unknown', message);
      console.warn('[order-queue] order_unknown', { order_id: job.order_id, user_id: job.user_id, idempotency_key: key, attempt_number: attempt });
      return { status: 'unknown' };
    }
    if (error && error.code === 'QUEUE_PRE_SUBMIT_TRANSIENT' && supplierContacted === false && attempt < maxAttempts()) {
      const message = 'تعذر تجهيز الطلب قبل الإرسال؛ سيعاد فحصه تلقائيًا';
      const nextAttemptAt = new Date(Date.now() + retryDelayMs(attempt)).toISOString();
      attemptLog = { requestStatus: 'retry', errorMessage: message, nextAttemptAt, supplierContacted: false };
      await postgres.updateAffiliateOrderQueueState(key, 'retry', { failureReason: message, nextAttemptAt });
      await notifyOrderChange(job, 'retry', message);
      console.error('[order-queue] pre_submit_retry', { order_id: job.order_id, user_id: job.user_id, idempotency_key: key, attempt_number: attempt, error: error.message });
      return { status: 'retry' };
    }
    const message = 'تعذر تجهيز الطلب تلقائيًا؛ راجع حالة الطلب قبل إعادة المحاولة';
    attemptLog = { requestStatus: 'unknown', errorMessage: message, supplierContacted };
    await postgres.updateAffiliateOrderQueueState(key, 'unknown', { failureReason: message });
    await postgres.updateAffiliateOrder(job.order_id, { status: 'قيد التحقق', requestStatus: 'unknown', failureReason: message, statusSyncedAt: new Date().toISOString() });
    await notifyOrderChange(job, 'unknown', message);
    console.error('[order-queue] worker_exhausted', { order_id: job.order_id, user_id: job.user_id, idempotency_key: key, attempt_number: attempt, error: error.message });
    return { status: 'unknown' };
  } finally {
    await recordAttempt(job, attempt, Object.assign({}, attemptLog, { responseTimeMs: Date.now() - startedAt, supplierContacted: attemptLog.supplierContacted == null ? null : attemptLog.supplierContacted }));
  }
}

async function processAffiliateOrderByKey(requestKey) {
  if (typeof postgres.claimAffiliateOrderJobByKey !== 'function') return { status: 'not_claimed', processed: 0 };
  const job = await postgres.claimAffiliateOrderJobByKey(requestKey);
  if (!job) return { status: 'not_claimed', processed: 0 };
  const result = await processAffiliateOrderJob(job);
  return Object.assign({ processed: 1 }, result);
}

async function processAffiliateOrderQueue(limit = 5) {
  const jobs = await postgres.claimAffiliateOrderJobs(limit);
  if (!jobs.length) return { scanned: 0, processed: 0 };
  const results = await Promise.all(jobs.map(job => processAffiliateOrderJob(job)));
  return { scanned: jobs.length, processed: results.length, results: results.map(item => item.status) };
}

async function reconcileAffiliateOrderQueue(limit = 50) {
  const template = String(process.env.SAFKA_ORDER_STATUS_URL || '').trim();
  if (!template) return { skipped: true, checked: 0 };
  const rows = await postgres.listAffiliateOrdersForSync();
  let checked = 0;
  for (const order of rows.slice(0, Math.max(1, Number(limit) || 50))) {
    const currentStatus = String(order.requestStatus || order.status || '').trim().toLowerCase();
    if (!['قيد التحقق', 'unknown', 'accepted', 'pending', 'processing', 'retry', 'قيد التأكيد', 'جاري التجهيز'].includes(currentStatus)) continue;
    const externalId = order.externalId || order.supplierOrderId;
    if (!externalId) continue;
    checked++;
    try {
      const url = template.replace(/\{id\}|:id/g, encodeURIComponent(String(externalId)));
      const body = await requestJson(url, undefined, 8000);
      const raw = body.status || (body.data && (body.data.status || body.data.order_status)) || (body.order && body.order.status);
      if (!raw) continue;
      const next = mapStatus(raw);
      if (next === 'قيد التأكيد' || next === 'جاري التجهيز') {
        const updated = await postgres.updateAffiliateOrderStatus(order.id || order.serial, { status: next, safkaStatus: raw, statusSyncedAt: new Date().toISOString(), requestStatus: 'accepted' });
        if (updated && updated.statusChanged) await notifyOrderChange({ order_id: order.id || order.serial, user_id: order.userId }, 'accepted', 'تم تحديث حالة طلبك: ' + next);
        continue;
      }
      const requestStatus = ['تم التأكيد', 'تم التاكيد', 'تم التسليم', 'تم التوصيل', 'delivered', 'completed'].includes(String(next).toLowerCase()) ? 'confirmed' : (next === 'فشل' || next === 'مرفوض' ? 'failed' : 'accepted');
      const updated = await postgres.updateAffiliateOrderStatus(order.id || order.serial, { status: next, safkaStatus: raw, statusSyncedAt: new Date().toISOString(), requestStatus });
      if (updated && updated.statusChanged) await notifyOrderChange({ order_id: order.id || order.serial, user_id: order.userId }, requestStatus, 'تم تحديث حالة طلبك: ' + next);
      console.log('[order-queue] order_reconciled', { order_id: order.id, user_id: order.userId, supplier_order_id: externalId, status: next });
    } catch (error) { console.warn('[order-queue] reconciliation skipped', { order_id: order.id, error: error.message }); }
  }
  return { skipped: false, checked };
}

async function syncOrderStatuses() {
  const template = String(process.env.SAFKA_ORDER_STATUS_URL || '').trim();
  if (!template) return { ok: true, skipped: true, reason: 'SAFKA_ORDER_STATUS_URL غير مضبوط في التوثيق العام' };
  const orders = await postgres.listAffiliateOrdersForSync();
  let changed = 0; let delivered = 0; let cursor = 0;
  const worker = async () => {
    while (true) {
      const order = orders[cursor++];
      if (!order) return;
      if (!statusUrl(order)) continue;
      try {
        const body = await requestJson(statusUrl(order));
        const raw = body.status || (body.data && (body.data.status || body.data.order_status)) || (body.order && body.order.status);
        const next = mapStatus(raw);
        if (!raw || next === order.status) continue;
        const updated = await postgres.updateAffiliateOrderStatus(order.id || order.serial, { status: next, safkaStatus: raw, statusSyncedAt: new Date().toISOString() });
        if (!updated) continue;
        changed++;
        if (updated.delivered) delivered++;
        if (global.notifyUser && updated.statusChanged && order.userId != null) await global.notifyUser(order.userId, 'تحديث حالة طلب', 'حالة طلبك الآن: ' + next, '/store', 'order-status', 'order-status:' + String(updated.order.id || order.id || order.serial) + ':' + next).catch(() => null);
      } catch (e) { console.warn('Safka status sync skipped order', order.id, e.message); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, Math.max(1, orders.length)) }, () => worker()));
  return { ok: true, checked: orders.length, changed, delivered };
}
async function runSync(options) {
  const result = { products: null, orders: null, affiliateRepair: null, orderQueue: null, orderReconciliation: null };
  try { result.orderQueue = await processAffiliateOrderQueue(5); } catch (e) { result.orderQueue = { ok: false, error: e.message }; }
  try { result.orderReconciliation = await reconcileAffiliateOrderQueue(50); } catch (e) { result.orderReconciliation = { ok: false, error: e.message }; }
  try {
    result.affiliateRepair = await postgres.repairAcceptedUntrackedAffiliateOrders(100);
  } catch (e) {
    result.affiliateRepair = { ok: false, error: e.message };
  }
  try { result.products = await syncProducts(options || {}); } catch (e) { result.products = { ok: false, error: e.message }; }
  try { result.orders = await syncOrderStatuses(); } catch (e) { result.orders = { ok: false, error: e.message }; }
  await saveMeta({ lastRunAt: new Date().toISOString(), lastResult: result });
  return result;
}
module.exports = { syncProducts, syncOrderStatuses, runSync, fetchAllProducts, processAffiliateOrderByKey, processAffiliateOrderQueue, processAffiliateOrderJob, reconcileAffiliateOrderQueue };
