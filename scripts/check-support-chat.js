const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const postgres = fs.readFileSync(path.join(root, 'lib', 'postgres.js'), 'utf8');
const support = fs.readFileSync(path.join(root, 'support-chat.js'), 'utf8');
const activePages = ['store2.html', 'index.html', 'landing.html', 'storefront.html'];

for (const file of activePages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  if (!html.includes('support-chat.css')) throw new Error(`${file}: support CSS missing`);
  if (!html.includes('support-chat.js')) throw new Error(`${file}: support JS missing`);
  for (const forbidden of ['wa.me/', 'rab7na-wa-public', 'api/support/whatsapp', 'waFloat']) {
    if (html.includes(forbidden)) throw new Error(`${file}: legacy WhatsApp marker remains: ${forbidden}`);
  }
}

for (const forbidden of ['wa.me/', 'api/support/whatsapp', 'localStorage', 'x-sq-token', 'x-auth-token']) {
  if (support.includes(forbidden)) throw new Error(`support-chat.js contains forbidden client pattern: ${forbidden}`);
}
for (const forbidden of ["/api/support/whatsapp", 'WHATSAPP_SUPPORT_NUMBER', 'SUPPORT_WHATSAPP']) {
  if (server.includes(forbidden)) throw new Error(`server.js contains legacy WhatsApp support contract: ${forbidden}`);
}

for (const route of [
  "app.get('/api/chat/messages', readCurrentChat);",
  "app.post('/api/chat/send', appendCurrentChat);",
  "const user = await currentUser(req);",
  'await postgres.getChatMessages(chatKeyForUser(user));',
  'await postgres.appendChatMessage(chatKeyForUser(user), message);'
]) {
  if (!server.includes(route)) throw new Error(`server chat contract missing: ${route}`);
}

const chatStart = server.indexOf('function chatKeyForUser');
const chatEnd = server.indexOf("app.post('/api/upload'", chatStart);
const chatSection = server.slice(chatStart, chatEnd);
if (chatSection.includes('firestore.saveChats')) throw new Error('chat route still uses full read-modify-write');
if (chatSection.includes('b.from')) throw new Error('chat route accepts spoofed sender');
if (!postgres.includes('async function getChatMessages(key)')) throw new Error('atomic chat read helper missing');
if (!postgres.includes('appendChatMessage, getChatMessages')) throw new Error('chat read helper is not exported');

const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
for (const route of ["app.get('/api/admin/chats'", "app.post('/api/admin/chat-reply'"]) {
  if (!admin.includes(route)) throw new Error(`admin support route missing: ${route}`);
}

console.log(`Support chat security check passed for ${activePages.length} active pages.`);
