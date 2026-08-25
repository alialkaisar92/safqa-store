'use strict';

const postgresPath = require.resolve('../lib/postgres');
const originalPostgres = require(postgresPath);
const savedEnv = {};
[
  'AI_PROVIDER', 'AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL',
  'BUILT_IN_FORGE_API_KEY', 'BUILT_IN_FORGE_API_URL',
  'OPENAI_API_KEY', 'OPENAI_API_BASE', 'OPENAI_BASE_URL',
  'AI_GATEWAY_API_KEY', 'VERCEL_OIDC_TOKEN', 'AI_GATEWAY_BASE_URL',
  'OLLAMA_BASE_URL', 'OLLAMA_MODEL'
].forEach(key => { savedEnv[key] = process.env[key]; delete process.env[key]; });

let savedMessages = [];
require.cache[postgresPath].exports = Object.assign({}, originalPostgres, {
  getAffiliateCatalogData: async () => ({ products: [
    { id: 'p-1', name: 'خلاط محمول', price: 350, basePrice: 250, commission: 100, available: true, cat: 'أجهزة' },
    { id: 'p-2', name: 'منظم مكتب', price: 180, basePrice: 130, commission: 50, available: true, cat: 'مكتب' },
    { id: 'p-3', name: 'مصباح', price: 220, basePrice: 170, commission: 50, available: false, cat: 'منزل' }
  ] }),
  getAffiliateUserData: async () => ({ orders: [{ id: 'o-1', userId: 'u-fallback', status: 'تم التوصيل', commission: 100, products: ['خلاط محمول'] }], withdrawals: [] }),
  getAiConversation: async () => savedMessages,
  saveAiConversation: async (_userId, messages) => { savedMessages = messages; return { messages }; },
  clearAiConversation: async () => { savedMessages = []; return true; }
});

(async () => {
  try {
    const ai = require('../services/ai-assistant');
    const user = { id: 'u-fallback', name: 'مسوق اختبار', balance: 0 };
    const top = await ai.chat({ user, message: 'رشحلي منتجات بعمولة عالية' });
    if (top.provider !== 'local-data-fallback') throw new Error('fallback provider was not selected');
    if (!top.answer.includes('خلاط محمول') || (!top.answer.includes('١٠٠') && !top.answer.includes('100'))) throw new Error('fallback did not use real commission data');

    const stats = await ai.chat({ user, message: 'اعرض ملخص أدائي ورصيدي' });
    if (!stats.answer.includes('إجمالي الطلبات: 1') || (!stats.answer.includes('١٠٠') && !stats.answer.includes('100'))) throw new Error('fallback did not use marketer data');

    const unavailable = await ai.chat({ user, message: 'هل مصباح متوفر؟' });
    if (!unavailable.answer.includes('غير متوفر')) throw new Error('fallback did not preserve unavailable status');
    if (savedMessages.length < 6) throw new Error('fallback conversation was not persisted');

    console.log(JSON.stringify({ ok: true, provider: top.provider, savedMessages: savedMessages.length }));
  } finally {
    Object.keys(savedEnv).forEach(key => {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    });
  }
})().catch(error => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
