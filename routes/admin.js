const router = require('express').Router();
const bcrypt = require('bcryptjs'), crypto = require('crypto'), rateLimit = require('express-rate-limit');
const db = require('../lib/db'), storage = require('../lib/storage'), A = require('../lib/async'), csrf = require('../lib/csrf');
const { slugify } = require('../lib/helpers'), { collections, singles } = require('../lib/resources');

const back = (req, def) => req.get('referer') || def;
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.locals.csrfToken = csrf.ensure(req); next(); });

// ---------- Login (sebelum auth) ----------
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).render('admin/login', { title: 'Login', error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' }) });
router.get('/login', (req, res) => req.session.admin ? res.redirect('/admin') : res.render('admin/login', { title: 'Login Admin', error: null }));
router.post('/login', loginLimit, A(async (req, res) => {
  if (!csrf.verify(req, req.body._csrf)) return res.status(403).send('Token tidak valid. Muat ulang halaman.');
  const a = await db.obj('admin');
  const ok = a.username && String(req.body.username) === a.username && await bcrypt.compare(String(req.body.password || ''), a.passwordHash);
  if (!ok) return res.status(401).render('admin/login', { title: 'Login Admin', error: 'Username atau password salah.' });
  req.session = { admin: true, csrf: crypto.randomBytes(24).toString('hex') };   // sesi baru setelah login
  res.redirect('/admin');
}));

router.use((req, res, next) => req.session.admin ? next() : res.redirect('/admin/login'));
router.use(A(async (req, res, next) => {
  if (req.method === 'POST' && !csrf.verify(req, req.body && req.body._csrf)) return res.status(403).send('Token keamanan tidak valid. Muat ulang halaman.');
  res.locals.unread = (await db.query('select count(*)::int as n from messages where read = false')).rows[0].n;
  Object.assign(res.locals, { collections, singles, sb: { url: process.env.SUPABASE_URL || '', key: process.env.SUPABASE_ANON_KEY || '' } });
  next();
}));
router.post('/logout', (req, res) => { req.session = null; res.redirect('/admin/login'); });

// ---------- Izin unggah langsung ke Supabase Storage (browser -> Supabase, tidak lewat server) ----------
router.post('/upload/sign', A(async (req, res) => {
  const { type, size, field } = req.body || {};
  if (!storage.EXT[type]) return res.status(400).json({ error: 'Format tidak didukung. Gambar: JPG/PNG/WebP/GIF. Video: MP4/WebM.' });
  const video = type.startsWith('video/');
  if (video && field !== 'media') return res.status(400).json({ error: 'Video hanya bisa diunggah pada kolom gambar/video latar slide.' });
  if (Number(size) > storage.LIMIT[video ? 'video' : 'image']) return res.status(400).json({ error: video ? 'Ukuran video maksimal 50 MB.' : 'Ukuran gambar maksimal 5 MB.' });
  res.json(await storage.signUpload(type));
}));

// ---------- Dashboard ----------
router.get('/', A(async (req, res) => {
  const [counts, messages, newsAll, admin] = await Promise.all([
    Promise.all(Object.keys(collections).map(async k => [k, await db.count(k)])).then(Object.fromEntries),
    db.list('messages'), db.list('news'), db.obj('admin')]);
  res.render('admin/dashboard', { title: 'Dashboard', counts, defaultPw: !!admin.passwordHash && bcrypt.compareSync('admin123', admin.passwordHash),
    recent: messages.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), latestNews: newsAll.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5) });
}));

// ---------- Helper bentuk data dari form ----------
// File sudah diunggah browser ke Storage; form hanya mengirim URL-nya (<field>__url). Server memverifikasi isinya.
async function build(def, req, existing) {
  const out = {}, errors = [], uploaded = [], toDelete = [];
  for (const f of def.fields) {
    const raw = req.body[f.name], old = existing?.[f.name];
    if (f.type === 'image' || f.type === 'media') {
      const isMedia = f.type === 'media', url = String(req.body[f.name + '__url'] || '').trim();
      if (url && url !== old) {
        const v = await storage.verify(url, { allowVideo: isMedia });
        if (!v.ok) { errors.push(`${f.label}: ${v.error}`); out[f.name] = old || ''; if (isMedia) out[f.name + 'Type'] = existing?.[f.name + 'Type'] || ''; }
        else { out[f.name] = url; uploaded.push(url); if (isMedia) out[f.name + 'Type'] = v.kind; if (old) toDelete.push(old); }
      } else if (req.body[f.name + '__remove'] === '1') { out[f.name] = ''; if (isMedia) out[f.name + 'Type'] = ''; if (old) toDelete.push(old); }
      else { out[f.name] = old || ''; if (isMedia) out[f.name + 'Type'] = existing?.[f.name + 'Type'] || ''; }
    } else if (f.type === 'checkbox') out[f.name] = raw === 'on';
    else if (f.type === 'number') {
      const n = raw === '' || raw == null ? null : Number(raw); out[f.name] = Number.isFinite(n) ? n : null;
      if (f.required && out[f.name] == null) errors.push(`${f.label} wajib diisi.`);
    } else if (f.type === 'select') out[f.name] = f.options.includes(raw) ? raw : f.options[0];
    else if (f.type === 'date') { out[f.name] = /^\d{4}-\d{2}-\d{2}$/.test(raw || '') ? raw : ''; if (f.required && !out[f.name]) errors.push(`${f.label} wajib diisi.`); }
    else { const v = String(raw ?? '').trim().slice(0, f.type === 'textarea' ? 10000 : 300); out[f.name] = v; if (f.required && !v) errors.push(`${f.label} wajib diisi.`); }
  }
  return { out, errors, uploaded, toDelete };
}
const sortList = (key, list) => key === 'date' ? list.sort((a, b) => String(b.date).localeCompare(String(a.date))) : list.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
const uniqueSlug = async (col, base, skipId) => { let s = slugify(base), i = 2; const all = await db.list(col); while (all.some(x => x.slug === s && x.id !== skipId)) s = slugify(base) + '-' + i++; return s; };
const imageFields = def => def.fields.filter(f => f.type === 'image' || f.type === 'media');
const formView = (req, extra) => ({ def: req.def, back: `/admin/r/${req.key}`, ...extra });

// ---------- CRUD koleksi ----------
router.param('res', (req, res, next, key) => { const def = collections[key]; if (!def) return res.status(404).render('site/404', { title: 'Tidak ditemukan' }); req.def = def; req.key = key; next(); });
router.get('/r/:res', A(async (req, res) => res.render('admin/list', { title: req.def.label, key: req.key, def: req.def, items: sortList(req.def.sort, await db.list(req.key)) })));
router.get('/r/:res/new', (req, res) => {
  const item = {}; req.def.fields.forEach(f => { if (f.default !== undefined) item[f.name] = f.default; });
  res.render('admin/form', formView(req, { title: 'Tambah ' + req.def.singular, item, errors: [], action: `/admin/r/${req.key}`, isNew: true }));
});
router.post('/r/:res', A(async (req, res) => {
  const { out, errors, uploaded } = await build(req.def, req, null);
  if (errors.length) { await storage.remove(uploaded); return res.status(400).render('admin/form', formView(req, { title: 'Tambah ' + req.def.singular, item: out, errors, action: `/admin/r/${req.key}`, isNew: true })); }
  if (req.def.fields.some(f => f.name === 'order') && out.order == null) out.order = Math.max(0, ...(await db.list(req.key)).map(i => i.order || 0)) + 1;
  if (req.def.slug) out.slug = await uniqueSlug(req.key, out.title);
  await db.add(req.key, out); req.flash('success', `${req.def.singular} berhasil ditambahkan.`); res.redirect(`/admin/r/${req.key}`);
}));
router.get('/r/:res/:id/edit', A(async (req, res, next) => {
  const item = await db.get(req.key, req.params.id); if (!item) return next();
  res.render('admin/form', formView(req, { title: 'Edit ' + req.def.singular, item, errors: [], action: `/admin/r/${req.key}/${item.id}`, isNew: false }));
}));
router.post('/r/:res/:id', A(async (req, res, next) => {
  const existing = await db.get(req.key, req.params.id); if (!existing) return next();
  const { out, errors, uploaded, toDelete } = await build(req.def, req, existing);
  if (errors.length) { await storage.remove(uploaded); return res.status(400).render('admin/form', formView(req, { title: 'Edit ' + req.def.singular, item: { ...existing, ...out }, errors, action: `/admin/r/${req.key}/${existing.id}`, isNew: false })); }
  if (req.def.fields.some(f => f.name === 'order') && out.order == null) out.order = existing.order ?? 9999;
  await db.update(req.key, existing.id, out); await storage.remove(toDelete);
  req.flash('success', 'Perubahan berhasil disimpan.'); res.redirect(`/admin/r/${req.key}`);
}));
router.post('/r/:res/:id/toggle', A(async (req, res, next) => {
  const it = await db.get(req.key, req.params.id); if (!it) return next();
  await db.update(req.key, it.id, { published: it.published === false }); res.redirect(back(req, `/admin/r/${req.key}`));
}));
router.post('/r/:res/:id/delete', A(async (req, res) => {
  const it = await db.get(req.key, req.params.id);
  if (it) { await db.remove(req.key, it.id); await storage.remove(imageFields(req.def).map(f => it[f.name])); req.flash('success', `${req.def.singular} dihapus.`); }
  res.redirect(`/admin/r/${req.key}`);
}));

// ---------- Pengaturan & About (objek tunggal) ----------
router.param('single', (req, res, next, key) => { const def = singles[key]; if (!def) return res.status(404).render('site/404', { title: 'Tidak ditemukan' }); req.def = def; req.key = key; next(); });
router.get('/s/:single', A(async (req, res) => res.render('admin/form', { title: req.def.label, def: req.def, item: await db.obj(req.key), errors: [], action: `/admin/s/${req.key}`, back: null, isNew: false, single: true })));
router.post('/s/:single', A(async (req, res) => {
  const existing = await db.obj(req.key), { out, errors, uploaded, toDelete } = await build(req.def, req, existing);
  if (errors.length) { await storage.remove(uploaded); return res.status(400).render('admin/form', { title: req.def.label, def: req.def, item: { ...existing, ...out }, errors, action: `/admin/s/${req.key}`, back: null, isNew: false, single: true }); }
  await db.setObj(req.key, { ...existing, ...out }); await storage.remove(toDelete);
  req.flash('success', 'Pengaturan disimpan.'); res.redirect(`/admin/s/${req.key}`);
}));

// ---------- Pesan masuk ----------
router.get('/messages', A(async (req, res) => res.render('admin/messages', { title: 'Pesan Masuk', items: (await db.list('messages')).sort((a, b) => b.date.localeCompare(a.date)) })));
router.post('/messages/:id/read', A(async (req, res) => { const m = await db.get('messages', req.params.id); if (m) await db.update('messages', m.id, { read: !m.read }); res.redirect('/admin/messages'); }));
router.post('/messages/:id/delete', A(async (req, res) => { await db.remove('messages', req.params.id); req.flash('success', 'Pesan dihapus.'); res.redirect('/admin/messages'); }));

// ---------- Akun ----------
router.get('/account', A(async (req, res) => res.render('admin/account', { title: 'Akun Admin', username: (await db.obj('admin')).username, errors: [] })));
router.post('/account', A(async (req, res) => {
  const a = await db.obj('admin'), { current, username, password, confirm } = req.body, errors = [];
  if (!(await bcrypt.compare(String(current || ''), a.passwordHash))) errors.push('Password saat ini salah.');
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(String(username || ''))) errors.push('Username 3–30 karakter (huruf, angka, _ . -).');
  if (password && String(password).length < 8) errors.push('Password baru minimal 8 karakter.');
  if (password && password !== confirm) errors.push('Konfirmasi password tidak sama.');
  if (errors.length) return res.status(400).render('admin/account', { title: 'Akun Admin', username: username || a.username, errors });
  await db.setObj('admin', { username, passwordHash: password ? await bcrypt.hash(String(password), 10) : a.passwordHash });
  req.flash('success', 'Akun diperbarui.'); res.redirect('/admin/account');
}));
module.exports = router;
