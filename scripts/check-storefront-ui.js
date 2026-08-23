'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'store2.html'), 'utf8');
const supportJs = fs.readFileSync(path.join(root, 'support-chat.js'), 'utf8');
const supportCss = fs.readFileSync(path.join(root, 'support-chat.css'), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(html.includes('IBM+Plex+Sans+Arabic'), 'IBM Plex Sans Arabic font is missing');
assert(html.includes('id="rab7na-premium-ui"'), 'premium design system layer is missing');
assert(html.includes('overflow-x:hidden'), 'horizontal overflow guard is missing');
assert(html.includes('safe-area-inset-bottom'), 'mobile safe-area support is missing');
assert(html.includes('function clearSearch()'), 'search clear interaction is missing');
assert(html.includes('function uiText(') && html.includes('Extended_Pictographic'), 'emoji-safe UI text handling is missing');
assert(html.includes('categoryIcon(') && html.includes('<svg viewBox="0 0 24 24"'), 'SVG category/icon system is missing');
assert(html.includes('سعر الجملة') && html.includes('سعر البيع المقترح') && html.includes('عمولتك المتوقعة'), 'product financial hierarchy is missing');
assert(html.includes('onclick="openWallet()"') && !html.includes('class="cart-nav"'), 'bottom navigation must reserve one slot for wallet, not duplicate cart');
assert(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html), 'raw Unicode emoji remains in storefront source');
assert(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(supportJs + supportCss), 'raw Unicode emoji remains in support chat source');
assert(supportCss.includes('#rab7naSupportRoot .support-launch{left:auto;right:20px') && supportCss.includes('#rab7naSupportRoot .support-panel{left:auto;right:20px'), 'support chat is not placed on the right');
assert(html.includes('body.modal-open #storeAiLaunch') && html.includes('body.modal-open #rab7naSupportRoot'), 'floating controls must hide while a drawer/modal is open');

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert(scripts.length >= 10, 'expected storefront inline scripts were not found');
scripts.forEach((match, index) => {
  try { new vm.Script(match[1], { filename: `store2-inline-${index}.js` }); }
  catch (error) { failures.push(`inline script ${index} syntax error: ${error.message}`); }
});
try { new vm.Script(supportJs, { filename: 'support-chat.js' }); }
catch (error) { failures.push(`support-chat.js syntax error: ${error.message}`); }

if (failures.length) {
  console.error(failures.map(item => `FAIL: ${item}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('storefront UI checks: PASS');
  console.log(`inline scripts parsed: ${scripts.length}`);
  console.log('raw emoji in storefront and support source: NO');
  console.log('network/order submitted by this test: NO');
}
