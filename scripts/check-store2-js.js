'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'store2.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
if (!scripts.length) throw new Error('No inline scripts found');
scripts.forEach((code, index) => new vm.Script(code, { filename: 'store2.html#script-' + (index + 1) }));
console.log('store2 inline script syntax passed: ' + scripts.length);
