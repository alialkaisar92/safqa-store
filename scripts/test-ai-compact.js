const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('services/ai-assistant.js', 'utf8');
const match = source.match(/function compactAnswer\([\s\S]*?\n}\n\nfunction money/);
if (!match) throw new Error('compactAnswer function not found');
const context = {};
vm.runInNewContext(`${match[0].replace(/\n\nfunction money[\s\S]*$/, '')}\nthis.compactAnswer = compactAnswer;`, context);

const raw = 'عنوان\\n- منتج 1 — سعر البيع: 100 ج.م — العمولة: 40 ج.م — متوفر\\n- منتج 2 — سعر البيع: 120 ج.م — العمولة: 50 ج.م — متوفر\\n- منتج 3 — سعر البيع: 130 ج.م — العمولة: 60 ج.م — متوفر\\n- منتج 4 — سعر البيع: 140 ج.م — العمولة: 70 ج.م — متوفر 🙂';
const compact = context.compactAnswer(raw, 420);
const productLines = compact.split('\n').filter(line => /^[-•]\s/.test(line));
if (compact.includes('\\n')) throw new Error('literal newline escape remained');
if (/[\u{1F300}-\u{1FAFF}]/u.test(compact)) throw new Error('emoji remained');
if (productLines.length !== 3) throw new Error(`expected 3 product lines, got ${productLines.length}`);
if (!compact.endsWith('…')) throw new Error('truncation marker missing');
console.log('PASS compact answer removes literal newlines and emoji and keeps 3 product lines');
