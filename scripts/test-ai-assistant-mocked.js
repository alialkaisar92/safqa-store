'use strict';

const postgresPath = require.resolve('../lib/postgres');
const fetchPath = require.resolve('node-fetch');
const originalPostgres = require(postgresPath);
const originalFetch = require(fetchPath);
const calls = [];

require.cache[postgresPath].exports = Object.assign({}, originalPostgres, {
  getAffiliateCatalogData: async () => ({ products: [
    { id: 'p-1', name: 'خلاط محمول', price: 350, basePrice: 250, commission: 100, available: true, cat: 'أجهزة' },
    { id: 'p-2', name: 'منظم مكتب', price: 180, basePrice: 130, commission: 50, available: true, cat: 'مكتب' },
    { id: 'p-3', name: 'مصباح', price: 220, basePrice: 170, commission: 50, available: false, cat: 'منزل' }
  ] }),
  getAffiliateUserData: async () => ({ orders: [{ id: 'o-1', userId: 'u-test', status: 'تم التوصيل', commission: 100, products: ['خلاط محمول'] }], withdrawals: [] }),
  getAiConversation: async () => [],
  saveAiConversation: async (_userId, messages) => ({ messages }),
  clearAiConversation: async () => true
});

require.cache[fetchPath].exports = async (url, options = {}) => {
  calls.push({ url: String(url), body: options.body ? JSON.parse(options.body) : null });
  if (String(url).endsWith('/models')) return { ok: true, json: async () => ({ data: [{ id: 'gpt-5-mini' }] }) };
  const body = options.body ? JSON.parse(options.body) : {};
  const hasToolResult = Array.isArray(body.messages) && body.messages.some(item => item.role === 'tool');
  if (!hasToolResult) {
    return { ok: true, json: async () => ({ choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'get_top_commission_products', arguments: '{"limit":2,"available_only":true}' } }] } }] }) };
  }
  return { ok: true, json: async () => ({ choices: [{ message: { role: 'assistant', content: 'أعلى المنتجات المتاحة في العمولة حسب البيانات الحالية: خلاط محمول 100 ج.م، ثم منظم مكتب 50 ج.م.' } }] }) };
};

(async () => {
  const ai = require('../services/ai-assistant');
  const result = await ai.chat({ user: { id: 'u-test', name: 'مسوق اختبار', balance: 0 }, message: 'رشحلي منتجات بعمولة عالية' });
  const toolCall = calls.find(call => call.body && call.body.messages && call.body.messages.some(item => item.role === 'tool'));
  if (!result.answer.includes('خلاط محمول')) throw new Error('tool-backed answer missing expected product');
  if (!toolCall) throw new Error('tool result was not returned to model');
  const toolMessage = toolCall.body.messages.find(item => item.role === 'tool');
  if (!toolMessage.content.includes('"commission":100')) throw new Error('tool payload did not contain real commission');
  console.log(JSON.stringify({ ok: true, answer: result.answer, modelCalls: calls.filter(call => call.url.endsWith('/chat/completions')).length, tool: 'get_top_commission_products' }));
})().catch(error => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
