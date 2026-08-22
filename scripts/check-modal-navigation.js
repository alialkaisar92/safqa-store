const fs = require('fs');
const html = fs.readFileSync('store2.html', 'utf8');

const checks = [
  ['modal navigation module exists', html.includes('id="modal-navigation"')],
  ['cart has visible close button', /id="cartMdl"[\s\S]*?class="modal-x"[\s\S]*?onclick="closeModalById\('cartMdl'\)"/.test(html)],
  ['checkout has visible close button', /id="coMdl"[\s\S]*?class="checkout-close"[\s\S]*?onclick="closeModalById\('coMdl'\)"/.test(html)],
  ['mobile modal close target is large enough', html.includes('.modal-x,.checkout-close{width:44px;height:44px')],
  ['modal history uses pushState', html.includes('history.pushState(state')],
  ['modal history uses popstate', html.includes("addEventListener('popstate'" )],
  ['back closes active modal before leaving', html.includes("if(active){") && html.includes('closeFromHistory(active)')],
  ['escape closes active modal', html.includes("event.key==='Escape'" )],
  ['assistant open state hides storefront chrome', html.includes("document.body.classList.toggle('store-ai-open'") && html.includes('body.store-ai-open .bnav')],
  ['cart open does not auto-navigate to checkout', html.includes("window.openCart=function(){") && html.includes("window.openModalById('cartMdl')")],
  ['price editor is included in modal stack', html.includes("'priceModal'")],
  ['account orders wallet ids match actual markup', ['accMdl','ordMdl','walMdl'].every(id => html.includes(`id="${id}"`) && html.includes(`'${id}'`)),],
  ['order success still follows server response', html.includes('if(r.ok&&d.ok)') && html.includes('showSuccessfulOrder')],
  ['checkout hides normal progress messages', html.includes("m.textContent='';") && html.includes("confirmButton.textContent='جاري حفظ الطلب…'")],
  ['checkout accepts queued response and polls safely', html.includes('showQueuedOrder') && html.includes('trackQueuedOrder') && html.includes('fetchQueuedOrderStatus')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`${failed} modal navigation check(s) failed`);
  process.exit(1);
}
console.log(`${checks.length} modal navigation checks passed`);
