module.exports = function(app, db, adminGuard) {
  // ---------- Migration (آمن ومتكرر من غير مشاكل) ----------
  db.exec(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT DEFAULT '',
    image TEXT DEFAULT '',
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  const pcols = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
  if (!pcols.includes('category_id')) {
    db.exec("ALTER TABLE products ADD COLUMN category_id INTEGER DEFAULT NULL");
    console.log('[categories] ✅ Added category_id to products');
  }
  const cnt = db.prepare("SELECT COUNT(*) as n FROM categories").get().n;
  if (cnt === 0) {
    const seed = ['إلكترونيات','أزياء وموضة','جمال وعناية شخصية','منزل ومطبخ','إكسسوارات','أخرى'];
    const ins = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)");
    seed.forEach((name, i) => ins.run(name, i));
    console.log('[categories] ✅ Seeded', seed.length, 'default categories');
  }

  // ---------- Public: التصنيفات النشطة (للمتجر) ----------
  app.get('/api/v2/categories', (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM categories WHERE active=1 ORDER BY sort_order, id").all();
      res.json(rows);
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  // ---------- Admin: كل التصنيفات (للأدمن) ----------
  app.get('/api/v2/categories/all', adminGuard, (req, res) => {
    try {
      const rows = db.prepare("SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) as products_count FROM categories c ORDER BY sort_order, id").all();
      res.json(rows);
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  // ---------- Admin: إضافة تصنيف ----------
  app.post('/api/v2/categories', adminGuard, (req, res) => {
    try {
      const { name, slug, image, description, sort_order, active } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({error: 'اسم التصنيف مطلوب'});
      const r = db.prepare("INSERT INTO categories (name, slug, image, description, sort_order, active) VALUES (?,?,?,?,?,?)")
        .run(String(name).trim(), slug || '', image || '', description || '', sort_order || 0, active === 0 ? 0 : 1);
      res.json({ok: true, id: Number(r.lastInsertRowid)});
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  // ---------- Admin: تعديل تصنيف ----------
  app.put('/api/v2/categories/:id', adminGuard, (req, res) => {
    try {
      const { name, slug, image, description, sort_order, active } = req.body || {};
      db.prepare(`UPDATE categories SET
        name=COALESCE(?,name), slug=COALESCE(?,slug), image=COALESCE(?,image),
        description=COALESCE(?,description), sort_order=COALESCE(?,sort_order),
        active=COALESCE(?,active) WHERE id=?`)
        .run(name ?? null, slug ?? null, image ?? null, description ?? null,
             sort_order ?? null, active ?? null, req.params.id);
      res.json({ok: true});
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  // ---------- Admin: حذف تصنيف (يفصل المنتجات عنه) ----------
  app.delete('/api/v2/categories/:id', adminGuard, (req, res) => {
    try {
      db.prepare("UPDATE products SET category_id=NULL WHERE category_id=?").run(req.params.id);
      db.prepare("DELETE FROM categories WHERE id=?").run(req.params.id);
      res.json({ok: true});
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  // ---------- Admin: ربط منتج بتصنيف ----------
  app.put('/api/v2/products/:id/category', adminGuard, (req, res) => {
    try {
      const { category_id } = req.body || {};
      db.prepare("UPDATE products SET category_id=? WHERE id=?").run(category_id || null, req.params.id);
      res.json({ok: true});
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  // __CAT_PRODUCTS__
  app.get('/api/v2/categories/:id/products', (req, res) => {
    try {
      const rows = db.prepare("SELECT id,name,price,sale_price,image,quantity,category_id FROM products WHERE category_id=? ORDER BY id").all(req.params.id);
      res.json(rows);
    } catch(e) { res.status(500).json({error: e.message}); }
  });
};
