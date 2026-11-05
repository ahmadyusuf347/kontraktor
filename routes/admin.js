const router = require('express').Router();
const multer = require('multer'), bcrypt = require('bcryptjs'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const rateLimit = require('express-rate-limit');
const db = require('../lib/db'), { slugify } = require('../lib/helpers'), { collections, singles } = require('../lib/resources');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (req, f, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[f.mimetype]) }),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, f, cb) => EXT[f.mimetype] ? cb(null, true) : cb(new Error('Format gambar harus JPG, PNG, WebP, atau GIF.'))
});
const rmFile = p => { if (p && p.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(p)), () => {}); };
const back = (req, def) => req.get('referer') || def;
const eq = (a, b) => a && b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// ---------- Login (sebelum auth) ----------
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).render('admin/login', { title: 'Login', error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' }) });
router.get('/login', (req, res) => req.session.admin ? res.redirect('/admin') : res.render('admin/login', { title: 'Login Admin', error: null }));
router.post('/login', loginLimit, async (req, res) => {
  if (!eq(String(req.body._csrf || ''), req.session.csrf)) return res.status(403).send('Token tidak valid.');
  const a = db.obj('admin');
  const ok = String(req.body.username) === a.username && await bcrypt.compare(String(req.body.password || ''), a.passwordHash);
  if (!ok) return res.status(401).render('admin/login', { title: 'Login Admin', error: 'Username atau password salah.' });
  req.session.regenerate(err => {
    if (err) return res.redirect('/admin/login');
    req.session.admin = true; req.session.csrf = crypto.randomBytes(24).toString('hex');
    res.redirect('/admin');
  });
});

router.use((req, res, next) => req.session.admin ? next() : res.redirect('/admin/login'));
router.use((req, res, next) => upload.any()(req, res, err => {
  if (err) { req.flash('error', err.message); return res.redirect(back(req, '/admin')); }
  next();
}));
router.use((req, res, next) => {
  if (req.method === 'POST' && !eq(String(req.body?._csrf || ''), req.session.csrf)) {
    (req.files || []).forEach(f => fs.unlink(f.path, () => {}));
    return res.status(403).send('Token keamanan tidak valid. Muat ulang halaman.');
  }
  res.locals.unread = db.list('messages').filter(m => !m.read).length;
  res.locals.collections = collections; res.locals.singles = singles;
  next();
});
router.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

// ---------- Dashboard ----------
router.get('/', (req, res) => {
  const counts = Object.fromEntries(Object.keys(collections).map(k => [k, db.list(k).length]));
  const messages = db.list('messages').sort((a, b) => b.date.localeCompare(a.date));
  res.render('admin/dashboard', { title: 'Dashboard', counts, defaultPw: bcrypt.compareSync('admin123', db.obj('admin').passwordHash), recent: messages.slice(0, 5), latestNews: db.list('news').sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5) });
});

// ---------- Helper bentuk data dari form ----------
function build(def, req, existing) {
  const out = {}, errors = [], newFiles = [], toDelete = [];
  const files = {}; (req.files || []).forEach(f => files[f.fieldname] = f);
  for (const f of def.fields) {
    const raw = req.body[f.name], old = existing?.[f.name];
    if (f.type === 'image') {
      const file = files[f.name];
      if (file) { out[f.name] = '/uploads/' + file.filename; newFiles.push(file.path); if (old) toDelete.push(old); }
      else if (req.body[f.name + '__remove'] === '1') { out[f.name] = ''; if (old) toDelete.push(old); }
      else out[f.name] = old || '';
    } else if (f.type === 'checkbox') out[f.name] = raw === 'on';
    else if (f.type === 'number') {
      const n = raw === '' || raw == null ? null : Number(raw); out[f.name] = Number.isFinite(n) ? n : null;
      if (f.required && out[f.name] == null) errors.push(`${f.label} wajib diisi.`);
    } else if (f.type === 'select') out[f.name] = f.options.includes(raw) ? raw : f.options[0];
    else if (f.type === 'date') { out[f.name] = /^\d{4}-\d{2}-\d{2}$/.test(raw || '') ? raw : ''; if (f.required && !out[f.name]) errors.push(`${f.label} wajib diisi.`); }
    else { const v = String(raw ?? '').trim().slice(0, f.type === 'textarea' ? 10000 : 300); out[f.name] = v; if (f.required && !v) errors.push(`${f.label} wajib diisi.`); }
  }
  return { out, errors, newFiles, toDelete };
}
const sortList = (key, list) => key === 'date' ? list.sort((a, b) => String(b.date).localeCompare(String(a.date))) : list.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
const uniqueSlug = (col, base, skipId) => { let s = slugify(base), i = 2; const all = db.list(col); while (all.some(x => x.slug === s && x.id !== skipId)) s = slugify(base) + '-' + i++; return s; };
const cleanup = files => files.forEach(p => fs.unlink(p, () => {}));

// ---------- CRUD koleksi ----------
router.param('res', (req, res, next, key) => { const def = collections[key]; if (!def) return res.status(404).render('site/404', { title: 'Tidak ditemukan' }); req.def = def; req.key = key; next(); });
router.get('/r/:res', (req, res) => res.render('admin/list', { title: req.def.label, key: req.key, def: req.def, items: sortList(req.def.sort, db.list(req.key)) }));
router.get('/r/:res/new', (req, res) => {
  const item = {}; req.def.fields.forEach(f => { if (f.default !== undefined) item[f.name] = f.default; });
  res.render('admin/form', { title: 'Tambah ' + req.def.singular, def: req.def, item, errors: [], action: `/admin/r/${req.key}`, back: `/admin/r/${req.key}`, isNew: true });
});
router.post('/r/:res', (req, res) => {
  const { out, errors, newFiles } = build(req.def, req, null);
  if (errors.length) { cleanup(newFiles); return res.status(400).render('admin/form', { title: 'Tambah ' + req.def.singular, def: req.def, item: out, errors, action: `/admin/r/${req.key}`, back: `/admin/r/${req.key}`, isNew: true }); }
  if (req.def.fields.some(f => f.name === 'order') && out.order == null) out.order = Math.max(0, ...db.list(req.key).map(i => i.order || 0)) + 1;
  if (req.def.slug) out.slug = uniqueSlug(req.key, out.title);
  db.add(req.key, out); req.flash('success', `${req.def.singular} berhasil ditambahkan.`); res.redirect(`/admin/r/${req.key}`);
});
router.get('/r/:res/:id/edit', (req, res, next) => {
  const item = db.get(req.key, req.params.id); if (!item) return next();
  res.render('admin/form', { title: 'Edit ' + req.def.singular, def: req.def, item, errors: [], action: `/admin/r/${req.key}/${item.id}`, back: `/admin/r/${req.key}`, isNew: false });
});
router.post('/r/:res/:id', (req, res, next) => {
  const existing = db.get(req.key, req.params.id); if (!existing) return next();
  const { out, errors, newFiles, toDelete } = build(req.def, req, existing);
  if (errors.length) { cleanup(newFiles); return res.status(400).render('admin/form', { title: 'Edit ' + req.def.singular, def: req.def, item: { ...existing, ...out }, errors, action: `/admin/r/${req.key}/${existing.id}`, back: `/admin/r/${req.key}`, isNew: false }); }
  if (req.def.fields.some(f => f.name === 'order') && out.order == null) out.order = existing.order ?? 9999;
  db.update(req.key, existing.id, out); toDelete.forEach(rmFile);
  req.flash('success', 'Perubahan berhasil disimpan.'); res.redirect(`/admin/r/${req.key}`);
});
router.post('/r/:res/:id/toggle', (req, res, next) => {
  const it = db.get(req.key, req.params.id); if (!it) return next();
  db.update(req.key, it.id, { published: it.published === false }); res.redirect(back(req, `/admin/r/${req.key}`));
});
router.post('/r/:res/:id/delete', (req, res) => {
  const it = db.get(req.key, req.params.id);
  if (it) { req.def.fields.filter(f => f.type === 'image').forEach(f => rmFile(it[f.name])); db.remove(req.key, it.id); req.flash('success', `${req.def.singular} dihapus.`); }
  res.redirect(`/admin/r/${req.key}`);
});

// ---------- Pengaturan & About (objek tunggal) ----------
router.param('single', (req, res, next, key) => { const def = singles[key]; if (!def) return res.status(404).render('site/404', { title: 'Tidak ditemukan' }); req.def = def; req.key = key; next(); });
router.get('/s/:single', (req, res) => res.render('admin/form', { title: req.def.label, def: req.def, item: db.obj(req.key), errors: [], action: `/admin/s/${req.key}`, back: null, isNew: false, single: true }));
router.post('/s/:single', (req, res) => {
  const existing = db.obj(req.key), { out, errors, newFiles, toDelete } = build(req.def, req, existing);
  if (errors.length) { cleanup(newFiles); return res.status(400).render('admin/form', { title: req.def.label, def: req.def, item: { ...existing, ...out }, errors, action: `/admin/s/${req.key}`, back: null, isNew: false, single: true }); }
  db.setObj(req.key, { ...existing, ...out }); toDelete.forEach(rmFile);
  req.flash('success', 'Pengaturan disimpan.'); res.redirect(`/admin/s/${req.key}`);
});

// ---------- Pesan masuk ----------
router.get('/messages', (req, res) => res.render('admin/messages', { title: 'Pesan Masuk', items: db.list('messages').sort((a, b) => b.date.localeCompare(a.date)) }));
router.post('/messages/:id/read', (req, res) => { const m = db.get('messages', req.params.id); if (m) db.update('messages', m.id, { read: !m.read }); res.redirect('/admin/messages'); });
router.post('/messages/:id/delete', (req, res) => { db.remove('messages', req.params.id); req.flash('success', 'Pesan dihapus.'); res.redirect('/admin/messages'); });

// ---------- Akun ----------
router.get('/account', (req, res) => res.render('admin/account', { title: 'Akun Admin', username: db.obj('admin').username, errors: [] }));
router.post('/account', async (req, res) => {
  const a = db.obj('admin'), { current, username, password, confirm } = req.body, errors = [];
  if (!(await bcrypt.compare(String(current || ''), a.passwordHash))) errors.push('Password saat ini salah.');
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(String(username || ''))) errors.push('Username 3–30 karakter (huruf, angka, _ . -).');
  if (password && String(password).length < 8) errors.push('Password baru minimal 8 karakter.');
  if (password && password !== confirm) errors.push('Konfirmasi password tidak sama.');
  if (errors.length) return res.status(400).render('admin/account', { title: 'Akun Admin', username: username || a.username, errors });
  db.setObj('admin', { username, passwordHash: password ? await bcrypt.hash(String(password), 10) : a.passwordHash });
  req.flash('success', 'Akun diperbarui.'); res.redirect('/admin/account');
});
module.exports = router;
