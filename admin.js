const path = require('path');
const store = require('./firestore');

async function data() { return store.getAffiliateData(); }
async function users() { return { users: await store.getUsers() }; }
async function chats() { return store.getChats(); }
async function writeData(d) { await store.saveAffiliateData(d); }
async function writeUsers(u) { await store.saveUsers(u.users || []); }

module.exports = function (app) {
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const [d, u, c] = await Promise.all([data(), users(), chats()]);
      const orders = d.orders || [];
      const commission = orders.reduce((s, o) => s + (+o.commission || 0), 0);
      const sales = orders.filter(o => o.status === 'تم التسليم').length;
      const byStatus = {}; orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
      res.json({ orders: orders.length, commission, sales, users: u.users.length, products: (d.products || []).length, withdrawals: (d.withdrawals || []).filter(w => w.status === 'pending').length, chats: Object.keys(c).length, byStatus, recent: orders.slice(0, 8) });
    } catch (e) { res.status(500).json({ error: 'تعذر تحميل الإحصائيات' }); }
  });
  app.get('/api/admin/orders', async (req, res) => { try { res.json((await data()).orders || []); } catch (e) { res.status(500).json({ error: 'تعذر تحميل الطلبات' }); } });
  app.post('/api/admin/order-status', async (req, res) => {
    try {
      const b = req.body || {}; const d = await data(); const o = (d.orders || []).find(x => String(x.id) === String(b.id));
      if (!o) return res.json({ error: 'مش موجود' });
      const previous = o.status; o.status = b.status;
      await writeData(d);
      if (b.status === 'تم التسليم' && previous !== 'تم التسليم' && o.userId != null && (+o.commission || 0) > 0) {
        const u = await store.getUser(o.userId);
        if (u) { u.balance = (+u.balance || 0) + (+o.commission || 0); u.totalEarned = (+u.totalEarned || 0) + (+o.commission || 0); await store.saveUser(u); }
      }
      if (global.sendPush) global.sendPush({ headings: 'تحديث حالة طلب', contents: 'حالة طلبك الآن: ' + b.status, url: '/' });
      res.json({ ok: true });
    } catch (e) { console.error('order-status:', e.message); res.status(500).json({ error: 'تعذر تحديث الطلب' }); }
  });
  app.get('/api/admin/products', async (req, res) => { try { res.json((await data()).products || []); } catch (e) { res.status(500).json({ error: 'تعذر تحميل المنتجات' }); } });
  app.post('/api/admin/product', async (req, res) => {
    try { const b = req.body || {}; const d = await data(); d.products = d.products || []; if (b.id) { const p = d.products.find(x => String(x.id) === String(b.id)); if (p) Object.assign(p, b); } else { b.id = Date.now(); d.products.push(b); if (global.sendPush) global.sendPush({ headings: 'منتج جديد', contents: b.name, url: '/' }); } await writeData(d); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: 'تعذر حفظ المنتج' }); }
  });
  app.post('/api/admin/product-delete', async (req, res) => { try { const d = await data(); d.products = (d.products || []).filter(x => String(x.id) !== String(req.body.id)); await writeData(d); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر حذف المنتج' }); } });
  app.get('/api/admin/price', async (req, res) => { try { res.json({ up: (await data()).priceUp || 0 }); } catch (e) { res.status(500).json({ error: 'تعذر تحميل السعر' }); } });
  app.post('/api/admin/price-up', async (req, res) => { try { const d = await data(); let v = +(req.body && req.body.up) || 0; v = Math.max(0, Math.min(200, v)); d.priceUp = v; await writeData(d); res.json({ ok: true, up: v }); } catch (e) { res.status(500).json({ error: 'تعذر حفظ الزيادة' }); } });
  app.get('/api/admin/users', async (req, res) => { try { const db = await users(); const now = Date.now(); res.json((db.users || []).map(u => ({ id: u.id, name: u.name, contact: u.contact, balance: u.balance || 0, created: u.created, lastSeen: u.lastSeen || 0, banned: !!u.banned, lastAction: u.lastAction || '', activity: (u.activity || []).slice(0, 50), online: !!(u.lastSeen && now - u.lastSeen < 120000) }))); } catch (e) { res.status(500).json({ error: 'تعذر تحميل المستخدمين' }); } });
  app.post('/api/admin/user-ban', async (req, res) => { try { const db = await users(); const u = (db.users || []).find(x => String(x.id) === String(req.body.id)); if (!u) return res.json({ error: 'مش موجود' }); u.banned = !!req.body.banned; await store.saveUser(u); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر تحديث الحساب' }); } });
  app.get('/api/admin/withdrawals', async (req, res) => { try { res.json((await data()).withdrawals || []); } catch (e) { res.status(500).json({ error: 'تعذر تحميل السحوبات' }); } });
  app.post('/api/admin/withdrawal-status', async (req, res) => { try { const d = await data(); const w = (d.withdrawals || []).find(x => String(x.id) === String(req.body.id)); if (!w) return res.json({ error: 'مش موجود' }); w.status = req.body.status; await writeData(d); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر تحديث السحب' }); } });
  app.get('/api/admin/chats', async (req, res) => { try { res.json(await chats()); } catch (e) { res.status(500).json({ error: 'تعذر تحميل المحادثات' }); } });
  app.post('/api/admin/chat-reply', async (req, res) => { try { const b = req.body || {}; const all = await chats(); all[b.key] = all[b.key] || []; all[b.key].push({ id: Date.now(), from: 'support', type: 'text', text: b.text || '', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }); await store.saveChats(all); if (global.notifyChat) global.notifyChat(); if (global.notifyUser && b.key && b.key[0] === 'u') global.notifyUser(b.key.slice(1), 'رد من الدعم', b.text, '/'); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر إرسال الرد' }); } });
  let sse = []; global.notifyChat = () => sse.forEach(f => { try { f(); } catch (e) {} });
  app.get('/api/admin/chat-stream', (req, res) => { res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }); res.flushHeaders(); res.write('data: ok\n\n'); const push = () => res.write('data: ' + Date.now() + '\n\n'); sse.push(push); req.on('close', () => { sse = sse.filter(x => x !== push); }); });
  app.get('/api/admin/settings', async (req, res) => { try { res.json((await data()).settings || { name: 'Rab7na', currency: 'ج.م', whatsapp: '', commission: 30, announcement: '' }); } catch (e) { res.status(500).json({ error: 'تعذر تحميل الإعدادات' }); } });
  app.post('/api/admin/settings', async (req, res) => { try { const d = await data(); d.settings = Object.assign(d.settings || {}, req.body || {}); await writeData(d); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر حفظ الإعدادات' }); } });
};
