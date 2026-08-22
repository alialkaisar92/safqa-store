'use strict';
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'dashboard.html'), 'utf8');
const server = fs.readFileSync(require('path').join(__dirname, '..', 'server.js'), 'utf8');
const service = fs.readFileSync(require('path').join(__dirname, '..', 'services', 'ai-assistant.js'), 'utf8');
let dashboardScriptOk = false;
try { const vm = require('vm'); const start = html.indexOf('<script>'); const end = html.lastIndexOf('</script>'); if (start < 0 || end <= start) throw new Error('dashboard script missing'); new vm.Script(html.slice(start + 8, end)); dashboardScriptOk = true; } catch (_) {}
const checks = [
  ['dashboard script compiles', dashboardScriptOk],
  ['dashboard has assistant trigger', /openAssistant\(\)/.test(html)],
  ['dashboard has modal close control', /إغلاق المساعد/.test(html)],
  ['dashboard has quick prompts', /usePrompt\(/.test(html)],
  ['dashboard uses history endpoint', /\/api\/affiliate\/ai\/history/.test(html)],
  ['dashboard uses chat endpoint', /\/api\/affiliate\/ai\/chat/.test(html)],
  ['dashboard has retry and copy actions', /retryAnswer\(\)/.test(html) && /copyAnswer\(/.test(html)],
  ['dashboard has no localStorage auth', !/localStorage|sessionStorage/.test(html)],
  ['server protects chat endpoint', /app\.post\('\/api\/affiliate\/ai\/chat'/.test(server) && /requireAffiliateAiUser/.test(server)],
  ['server protects history endpoint', /app\.get\('\/api\/affiliate\/ai\/history'/.test(server) && /app\.delete\('\/api\/affiliate\/ai\/history'/.test(server)],
  ['server applies rate limit', /aiRateLimit\(user\.id\)/.test(server)],
  ['service has tool-backed context', /get_top_commission_products/.test(service) && /get_marketer_stats/.test(service)],
  ['service has bounded input', /MAX_MESSAGE_CHARS/.test(service) && /text\(message, MAX_MESSAGE_CHARS\)/.test(service)],
  ['service supports Vercel AI Gateway', /AI_GATEWAY_API_KEY/.test(service) && /ai-gateway\.vercel\.sh\/v1/.test(service)],
  ['gateway GPT-5 uses completion token limit', /gpt-5/i.test(service) && /max_completion_tokens/.test(service)]
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed += 1; }
if (failed) process.exitCode = 1;
else console.log(`all ${checks.length} affiliate AI checks passed`);
