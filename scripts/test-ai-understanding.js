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
  getAffiliateCatalogData: async () => ({
    priceUp: 0,
    products: [
      { id: 'p-1', name: 'خلاط محمول', price: 350, basePrice: 250, commission: 100, available: true, cat: 'أجهزة' },
      { id: 'p-2', name: 'منظم مكتب', price: 180, basePrice: 130, commission: 50, available: true, cat: 'مكتب' },
      { id: 'p-3', name: 'مصباح', price: 220, basePrice: 170, commission: 50, available: false, cat: 'منزل' },
      { id: 'p-4', name: 'مكنسة لاسلكية', price: 320, basePrice: 320, commission: 0, available: true, cat: 'منزل', note: 'سعر البيع المقترح: 500 ج.م — عمولتك: 180 ج.م' }
    ]
  }),
  getAffiliateUserData: async () => ({ orders: [], withdrawals: [] }),
  getAiConversation: async () => savedMessages,
  saveAiConversation: async (_userId, messages) => { savedMessages = messages; return { messages }; },
  clearAiConversation: async () => { savedMessages = []; return true; }
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  try {
    const ai = require('../services/ai-assistant');
    const user = { id: 'u-understanding', name: 'مسوق اختبار', balance: 0 };
    const top = await ai.chat({ user, message: 'رشحلي 3 منتجات بعمولة عالية', compact: true });
    assert(top.provider === 'local-data-fallback', 'expected local fallback in isolated test');
    assert(top.answer.includes('مكنسة لاسلكية') && (top.answer.includes('180') || top.answer.includes('١٨٠')), 'did not derive sale price/commission from product note: ' + top.answer);
    assert((top.answer.match(/^- /gm) || []).length === 3, 'recommendation did not contain three product lines');

    const second = await ai.chat({ user, message: 'التاني حالته ايه؟', compact: true });
    assert(second.answer.includes('خلاط محمول') && second.answer.includes('متوفر'), 'did not resolve the second product from conversation context');

    const ad = await ai.chat({ user, message: 'اعمل إعلان للمنتج اللي فات', compact: true });
    assert(ad.answer.includes('خلاط محمول'), 'did not resolve the previous product for an ad request');

    const followUp = await ai.chat({ user, message: 'وده سعره وعمولته كام؟', compact: true });
    assert(followUp.answer.includes('خلاط محمول') && (followUp.answer.includes('350') || followUp.answer.includes('٣٥٠')) && (followUp.answer.includes('100') || followUp.answer.includes('١٠٠')), 'did not resolve a deictic follow-up question: ' + followUp.answer);

    console.log(JSON.stringify({ ok: true, provider: top.provider, messages: savedMessages.length }));
  } finally {
    require.cache[postgresPath].exports = originalPostgres;
    Object.keys(savedEnv).forEach(key => {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    });
  }
})().catch(error => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
