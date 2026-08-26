'use strict';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
const MAX_DESCRIPTION_LENGTH = 1800;

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function productContext(product) {
  const value = product && typeof product === 'object' ? product : {};
  const properties = Array.isArray(value.properties) ? value.properties.slice(0, 20).map(item => ({
    name: String(item && (item.key || item.name || item.title) || '').slice(0, 120),
    optionPrice: safeNumber(item && (item.sale_price != null ? item.sale_price : item.price)),
    available: item && typeof item.is_available === 'boolean' ? item.is_available : null
  })).filter(item => item.name || item.optionPrice != null || item.available != null) : [];
  return {
    name: String(value.name || value.title || '').slice(0, 240),
    category: String(value.category || value.cat || value._cat || '').slice(0, 120),
    price: safeNumber(value.price),
    wholesalePrice: safeNumber(value.basePrice != null ? value.basePrice : (value.base_price != null ? value.base_price : value.cost)),
    existingDescription: String(value.description || value.desc || '').slice(0, 1200),
    properties
  };
}

function geminiError(body, status) {
  const code = body && body.error && body.error.status;
  const error = new Error(code === 'RESOURCE_EXHAUSTED' || status === 429
    ? 'تم الوصول لحد الاستخدام المجاني مؤقتًا، حاول مرة أخرى لاحقًا.'
    : status === 401 || status === 403
      ? 'مفتاح Gemini غير صالح أو غير مفعّل.'
      : 'تعذر توليد الوصف حاليًا، حاول مرة أخرى.');
  error.code = 'GEMINI_UPSTREAM_ERROR';
  error.status = status;
  return error;
}

async function generateProductDescription(product) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error('ميزة توليد الوصف غير مفعلة حاليًا.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }
  const context = productContext(product);
  if (!context.name) {
    const error = new Error('اسم المنتج مطلوب لتوليد الوصف.');
    error.code = 'GEMINI_PRODUCT_NAME_REQUIRED';
    throw error;
  }
  const systemInstruction = [
    'أنت كاتب وصف منتجات ومسوق مصري محترف بخبرة طويلة.',
    'اكتب وصفًا جذابًا باللهجة المصرية العامية، يركز على فائدة المنتج للعميل واستخدامه العملي.',
    'استخدم المعلومات الموجودة فقط في بيانات المنتج، ولا تخترع مواصفات أو أرقامًا أو نتائج أو ضمانات.',
    'ممنوع الادعاءات الطبية أو العلاجية أو الوعود المضمونة أو المبالغة التسويقية.',
    'الرد يكون فقرة أو فقرتين قصيرتين فقط، من 50 إلى 110 كلمة تقريبًا، بدون عنوان أو نقاط أو علامات Markdown.'
  ].join(' ');
  const requestBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: 'بيانات المنتج بصيغة JSON:\n' + JSON.stringify(context, null, 2) }] }],
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 260,
      responseMimeType: 'text/plain'
    }
  };
  let response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000)
    });
  } catch (error) {
    const timeout = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    const safe = new Error(timeout ? 'انتهى وقت توليد الوصف، حاول مرة أخرى.' : 'تعذر الاتصال بخدمة توليد الوصف حاليًا.');
    safe.code = 'GEMINI_NETWORK_ERROR';
    throw safe;
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw geminiError(body, response.status);
  const text = Array.isArray(body.candidates)
    ? body.candidates.flatMap(candidate => Array.isArray(candidate && candidate.content && candidate.content.parts) ? candidate.content.parts : []).map(part => String(part && part.text || '').trim()).filter(Boolean).join('\n')
    : '';
  const description = text.replace(/```[\s\S]*?```/g, '').replace(/^\s*(?:وصف المنتج|الوصف):\s*/i, '').trim().slice(0, MAX_DESCRIPTION_LENGTH);
  if (description.length < 20) {
    const error = new Error('لم ينتج Gemini وصفًا صالحًا، حاول مرة أخرى.');
    error.code = 'GEMINI_EMPTY_RESPONSE';
    throw error;
  }
  return { description, model: GEMINI_MODEL };
}

module.exports = { GEMINI_MODEL, GEMINI_ENDPOINT, productContext, generateProductDescription };
