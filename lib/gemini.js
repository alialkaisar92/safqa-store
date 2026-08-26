'use strict';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MAX_DESCRIPTION_LENGTH = 1800;
const MAX_ANALYSIS_LENGTH = 7000;

function geminiEndpoint(model) {
  return GEMINI_BASE_URL + encodeURIComponent(model) + ':generateContent';
}

const GEMINI_ENDPOINT = geminiEndpoint(GEMINI_MODEL);

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
    existingDescription: String(value.description || value.desc || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200),
    properties
  };
}

function geminiError(body, status) {
  const code = body && body.error && body.error.status;
  const error = new Error(code === 'RESOURCE_EXHAUSTED' || status === 429
    ? 'تم الوصول لحد الاستخدام المجاني مؤقتًا، حاول مرة أخرى لاحقًا.'
    : status === 401 || status === 403
      ? 'مفتاح Gemini غير صالح أو غير مفعّل.'
      : status === 400
        ? 'إعدادات طلب Gemini غير صالحة حاليًا.'
        : status === 404
          ? 'موديل Gemini غير متاح حاليًا.'
          : 'تعذر توليد المحتوى حاليًا، حاول مرة أخرى.');
  error.code = 'GEMINI_UPSTREAM_ERROR';
  error.status = status;
  // This is an enum-like provider reason only; never retain or log the raw response.
  error.reason = typeof code === 'string' ? code.replace(/[^A-Z0-9_]/g, '').slice(0, 80) : null;
  return error;
}

function requestBodyFor(context) {
  const systemInstruction = [
    'أنت كاتب وصف منتجات ومسوق مصري محترف بخبرة طويلة.',
    'اكتب وصفًا جذابًا باللهجة المصرية العامية، يركز على فائدة المنتج للعميل واستخدامه العملي.',
    'استخدم المعلومات الموجودة فقط في بيانات المنتج، ولا تخترع مواصفات أو أرقامًا أو نتائج أو ضمانات.',
    'ممنوع الادعاءات الطبية أو العلاجية أو الوعود المضمونة أو المبالغة التسويقية.',
    'الرد يكون فقرة أو فقرتين قصيرتين فقط، من 50 إلى 110 كلمة تقريبًا، بدون عنوان أو نقاط أو علامات Markdown.'
  ].join(' ');
  return {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: 'بيانات المنتج بصيغة JSON:\n' + JSON.stringify(context, null, 2) }] }],
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 260
    }
  };
}

function requestBodyForAnalysis(context) {
  const systemInstruction = [
    'أنت خبير تسويق وبيع بالعمولة في السوق المصري بخبرة 20 سنة، وتكتب للمسوق كأنك مستشاره الشخصي.',
    'حلل منتجًا واحدًا واكتب توصية عملية بالعامية المصرية اعتمادًا فقط على بيانات المنتج المرسلة.',
    'ابدأ مباشرة بالزتونة بدون تحية أو مقدمة عامة، وكن محددًا: لماذا قد يشتري العميل هذا المنتج وكيف نبيعه بذكاء.',
    'ممنوع اختراع مواصفات أو أرقام أو نتائج أو ضمانات، وممنوع الادعاءات الطبية أو العلاجية أو المبالغة.',
    'استخدم العناوين التالية بالترتيب وبنفس الكتابة، واجعل كل قسم مختصرًا وسهل التنفيذ:',
    '## الزتونة',
    'اكتب 2 إلى 3 جمل تلخص أقوى زاوية بيع حقيقية للمنتج ولمن يناسب.',
    '## تقييم الخبير',
    'اكتب في أول سطر: التقييم: X/10، ثم سطرًا يشرح قابلية البيع، ثم سطرًا يذكر أهم تحفظ أو مخاطرة. لا تمنح 10/10 إلا إذا كانت البيانات تدعم ذلك.',
    '## أفكار بوستات',
    'ثلاث أفكار مختلفة، لكل فكرة عنوان جذاب ونص قصير جاهز للنشر.',
    '## أفكار ترويج وبيدج',
    'ثلاث نصائح مرتبطة بالمنتج لنوع المحتوى والاستهداف والتوقيت.',
    '## رد على اعتراض السعر',
    'رد جاهز مقنع ومحترم بالعامية عندما يقول العميل: غالي.',
    '## رد على عميل زعلان',
    'رد هادئ ومحترف يحافظ على العميل.',
    'إذا كانت معلومة غير موجودة في البيانات، لا تفترضها ولا تذكرها كحقيقة.'
  ].join('\n');
  return {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: 'بيانات المنتج بصيغة JSON:\n' + JSON.stringify(context, null, 2) }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1200
    }
  };
}

async function generateGeminiText(body, maxLength, minLength) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error('ميزة الذكاء الاصطناعي غير مفعلة حاليًا.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const modelsToTry = [GEMINI_MODEL];
  let response;
  let payload = {};
  let usedModel = GEMINI_MODEL;
  for (let index = 0; index < modelsToTry.length; index += 1) {
    usedModel = modelsToTry[index];
    try {
      response = await fetch(geminiEndpoint(usedModel), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
      });
    } catch (error) {
      const timeout = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      const safe = new Error(timeout ? 'انتهى وقت التحليل، حاول مرة أخرى.' : 'تعذر الاتصال بخدمة الذكاء الاصطناعي حاليًا.');
      safe.code = 'GEMINI_NETWORK_ERROR';
      throw safe;
    }
    payload = await response.json().catch(() => ({}));
    const reason = payload && payload.error && payload.error.status;
    if (response.ok) break;
    const canUseFallback = index === 0 && response.status === 404 && reason === 'NOT_FOUND' && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL;
    if (canUseFallback) {
      modelsToTry.push(GEMINI_FALLBACK_MODEL);
      continue;
    }
    throw geminiError(payload, response.status);
  }

  const text = Array.isArray(payload.candidates)
    ? payload.candidates.flatMap(candidate => Array.isArray(candidate && candidate.content && candidate.content.parts) ? candidate.content.parts : []).map(part => String(part && part.text || '').trim()).filter(Boolean).join('\n')
    : '';
  const answer = text.replace(/```(?:markdown|text)?\s*/gi, '').replace(/```/g, '').trim().slice(0, maxLength);
  if (answer.length < minLength) {
    const error = new Error('لم ينتج Gemini محتوى صالحًا، حاول مرة أخرى.');
    error.code = 'GEMINI_EMPTY_RESPONSE';
    throw error;
  }
  return { text: answer, model: usedModel };
}

async function generateProductDescription(product) {
  const context = productContext(product);
  if (!context.name) {
    const error = new Error('اسم المنتج مطلوب لتوليد الوصف.');
    error.code = 'GEMINI_PRODUCT_NAME_REQUIRED';
    throw error;
  }
  const result = await generateGeminiText(requestBodyFor(context), MAX_DESCRIPTION_LENGTH, 20);
  return { description: result.text.replace(/^\s*(?:وصف المنتج|الوصف):\s*/i, '').trim(), model: result.model };
}

async function generateProductAnalysis(product) {
  const value = product && typeof product === 'object' ? product : {};
  const context = productContext({
    name: value.name,
    category: value.category,
    price: value.price,
    description: value.description,
    properties: value.properties
  });
  if (!context.name) {
    const error = new Error('اسم المنتج مطلوب للتحليل.');
    error.code = 'GEMINI_PRODUCT_NAME_REQUIRED';
    throw error;
  }
  const result = await generateGeminiText(requestBodyForAnalysis(context), MAX_ANALYSIS_LENGTH, 60);
  return { answer: result.text, model: result.model };
}

module.exports = { GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_ENDPOINT, productContext, generateProductDescription, generateProductAnalysis };
