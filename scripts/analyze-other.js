const fs = require('fs');
const data = JSON.parse(fs.readFileSync('products-cache.json', 'utf8'));
const products = Array.isArray(data) ? data : [];
const other = products.filter(p => (p.cat || p.category || '') === 'أخرى');
const words = new Map();
for (const p of other) {
  const name = String(p.name || p.title || '').toLowerCase();
  for (const word of name.split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3)) words.set(word, (words.get(word) || 0) + 1);
}
console.log(JSON.stringify({
  total: products.length,
  other: other.length,
  samples: other.slice(0, 120).map(p => p.name || p.title),
  frequent: [...words.entries()].sort((a,b) => b[1]-a[1]).slice(0, 100)
}, null, 2));
