// عميل EasyOrders API — كل النداءات الخارجية مع معالجة أخطاء وعدم تعطيل
const config = require('../config/easyorders.config');
const logger = require('./logger');

function extractError(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  if (data.errors) {
    return Array.isArray(data.errors)
      ? data.errors.map(e => e.msg || e.message || String(e)).join(', ')
      : String(data.errors);
  }
  return null;
}

// المساعد الأساسي: يرجع دائماً { ok, status, data, error } — لا يرمي استثناءات
async function request(apiKey, method, path, opts) {
  opts = opts || {};
  const url = new URL(config.baseUrl + path);
  if (opts.query) {
    for (const k of Object.keys(opts.query)) {
      const v = opts.query[k];
      if (v != null && v !== '') url.searchParams.append(k, v);
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, config.timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method: method,
      headers: {
        [config.apiKeyHeader]: apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
    if (!res.ok) {
      logger.warn('EasyOrders API error', { method: method, path: path, status: res.status });
      return { ok: false, status: res.status, data: data, error: extractError(data) || ('HTTP ' + res.status) };
    }
    return { ok: true, status: res.status, data: data, error: null };
  } catch (e) {
    const isTimeout = e.name === 'AbortError';
    logger.error('EasyOrders request failed', { method: method, path: path, error: e.message, timeout: isTimeout });
    return { ok: false, status: 0, data: null, error: isTimeout ? 'انتهت مهلة الاتصال' : (e.message || 'فشل الاتصال') };
  } finally {
    clearTimeout(timer);
  }
}

// اختبار صلاحية الاتصال (أخف endpoint)
function testConnection(apiKey) {
  return request(apiKey, 'GET', config.endpoints.products, { query: { limit: 1 } });
}

function getProducts(apiKey, opts) {
  opts = opts || {};
  const query = { page: opts.page || 1, limit: opts.limit || 100 };
  if (opts.filter) query.filter = opts.filter;
  return request(apiKey, 'GET', config.endpoints.products, { query: query });
}

// جلب كل المنتجات مع pagination تلقائي (وحدّ أمان ضد اللانهائية)
async function fetchAllProducts(apiKey, opts) {
  opts = opts || {};
  const limit = opts.limit || 100;
  const maxPages = opts.maxPages || 20;
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await getProducts(apiKey, { page: page, limit: limit });
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : ((res.data && res.data.data) || []);
    for (const it of items) all.push(it);
    if (items.length < limit) break;
  }
  return { ok: true, status: 200, data: all, error: null };
}

function getProduct(apiKey, id) {
  return request(apiKey, 'GET', config.endpoints.product.replace(':id', id));
}

function createOrder(apiKey, orderPayload) {
  return request(apiKey, 'POST', config.endpoints.createOrder, { body: orderPayload });
}

function getOrder(apiKey, id) {
  return request(apiKey, 'GET', config.endpoints.order.replace(':id', id));
}

function getOrders(apiKey, opts) {
  opts = opts || {};
  const query = { page: opts.page || 1, limit: opts.limit || 50 };
  if (opts.filter) query.filter = opts.filter;
  return request(apiKey, 'GET', config.endpoints.orders, { query: query });
}

function getStore(apiKey) {
  return request(apiKey, 'GET', config.endpoints.store);
}

module.exports = {
  request: request,
  testConnection: testConnection,
  getProducts: getProducts,
  fetchAllProducts: fetchAllProducts,
  getProduct: getProduct,
  createOrder: createOrder,
  getOrder: getOrder,
  getOrders: getOrders,
  getStore: getStore
};
