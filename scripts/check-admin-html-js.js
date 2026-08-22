'use strict';
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'admin.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
if (!scripts.length) throw new Error('No inline script found');
for (const script of scripts) new vm.Script(script, { filename: 'admin.html:inline-script' });
console.log('admin-html-js: PASS (' + scripts.length + ' script)');
