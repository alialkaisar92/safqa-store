const fs = require('fs');
const html = fs.readFileSync('store2.html', 'utf8');
const checks = [
  ['store assistant launcher exists', html.includes('id="storeAiLaunch"') && html.includes('openStoreAssistant()')],
  ['store assistant modal exists', html.includes('id="storeAiMdl"') && html.includes('role="dialog"')],
  ['store assistant close control exists', html.includes('aria-label="إغلاق المساعد"') && html.includes('closeStoreAssistant()')],
  ['store assistant has guest login state', html.includes('المساعد متاح للمسوقين') && html.includes('/login?return=%2Fstore')],
  ['store assistant uses protected history endpoint', html.includes("/api/affiliate/ai/history")],
  ['store assistant uses protected chat endpoint', html.includes("/api/affiliate/ai/chat")],
  ['store assistant requests compact store replies', html.includes("compact:true") && html.includes("surface:'store'")],
  ['store assistant has mobile bounded layout', html.includes('height:auto;max-height:min(640px,76dvh)') && html.includes('z-index:10001!important')],
  ['store assistant hides launcher and bottom nav while open', html.includes('store-ai-open') && html.includes('body.store-ai-open .bnav,body.store-ai-open #storeAiLaunch')],
  ['store assistant limits displayed product bullets', html.includes('productLines>3') && html.includes('omittedProduct')],
  ['store assistant new conversation control is wired', html.includes('newStoreAiConversation') && html.includes('clearStoreAiConversation')],
  ['store assistant has retry copy and clear actions', html.includes('retryStoreAiAnswer') && html.includes('copyStoreAiAnswer') && html.includes('clearStoreAiConversation')],
  ['store assistant is managed by modal navigation', html.includes("'storeAiMdl'") && html.includes('openModalById') && html.includes('closeModalById')],
  ['store assistant avoids browser storage', !/<script id="store-ai-script">[\s\S]*localStorage/.test(html)],
  ['store page scripts compile', (() => { const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]; try { scripts.forEach((m) => new Function(m[1])); return true; } catch (_) { return false; } })()],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`all ${checks.length} store AI checks passed`);
