const fs = require('fs');
const html = fs.readFileSync('store2.html', 'utf8');
const checks = [
  ['store assistant launcher exists', html.includes('id="storeAiLaunch"') && html.includes('openStoreAssistant()')],
  ['store assistant modal exists', html.includes('id="storeAiMdl"') && html.includes('role="dialog"')],
  ['store assistant close control exists', html.includes('aria-label="إغلاق المساعد"') && html.includes('closeStoreAssistant()')],
  ['store assistant has guest login state', html.includes('المساعد متاح للمسوقين') && html.includes('/login?return=%2Fstore')],
  ['store assistant uses protected history endpoint', html.includes("/api/affiliate/ai/history")],
  ['store assistant uses protected chat endpoint', html.includes("/api/affiliate/ai/chat")],
  ['store assistant has retry copy and clear actions', html.includes('retryStoreAiAnswer') && html.includes('copyStoreAiAnswer') && html.includes('clearStoreAiConversation')],
  ['store assistant is managed by modal navigation', html.includes("'storeAiMdl'") && html.includes('openModalById') && html.includes('closeModalById')],
  ['store assistant avoids browser storage', !/<script id="store-ai-script">[\s\S]*localStorage/.test(html)],
  ['store page scripts compile', (() => { const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]; try { scripts.forEach((m) => new Function(m[1])); return true; } catch (_) { return false; } })()],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`all ${checks.length} store AI checks passed`);
