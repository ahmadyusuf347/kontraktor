require('dotenv').config();
const express = require('express'), cookieSession = require('cookie-session'), helmet = require('helmet');
const path = require('path'), fs = require('fs');
const db = require('./lib/db'), H = require('./lib/helpers'), A = require('./lib/async');

const app = express();
const ON_VERCEL = !!process.env.VERCEL;
const PROD = process.env.NODE_ENV === 'production' || ON_VERCEL;

app.engine('ejs', require('ejs').__express);          // eksplisit agar ikut terbundel di Vercel
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
if (ON_VERCEL || process.env.TRUST_PROXY) app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: PROD ? '1d' : 0 }));

// Session disimpan di cookie bertanda tangan (serverless tidak punya memori bersama)
const secret = process.env.SESSION_SECRET || (PROD ? null : 'dev-only-secret-change-me');
if (!secret) throw new Error('SESSION_SECRET wajib diatur di production (lihat .env.example).');
app.use(cookieSession({ name: 'kt.sess', keys: [secret], httpOnly: true, sameSite: 'lax', maxAge: 8 * 3600 * 1000,
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : ON_VERCEL }));

// versi aset untuk cache-busting
const assetV = () => process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)
  : (() => { try { return Math.floor(fs.statSync(path.join(__dirname, 'public', 'css', 'app.css')).mtimeMs); } catch (e) { return 0; } })();

app.use(A(async (req, res, next) => {
  req.flash = (type, msg) => { req.session.flash = [...(req.session.flash || []), { type, msg }]; };
  const flash = req.session.flash || []; if (flash.length) req.session.flash = [];
  const [S, footerServices] = await Promise.all([db.settings(), db.footerServices()]);
  Object.assign(res.locals, { v: assetV(), S, footerServices, path: req.path, flash, title: null, desc: null, dark: false,
    logo: (surface, h, hMd, textCls) => H.logo(S, surface, h, hMd, textCls),
    fmtDate: H.fmtDate, paragraphs: H.paragraphs, pill: H.pill, media: H.media, esc: H.esc });
  const ttl = Number(process.env.PAGE_CACHE_SECONDS || 0);
  if (ttl && req.method === 'GET' && !req.path.startsWith('/admin') && req.path !== '/contact')
    res.set('Cache-Control', `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`);
  next();
}));

app.use('/', require('./routes/site'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).render('site/404', { title: 'Halaman tidak ditemukan' }));
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).type('text').send(PROD ? 'Terjadi kesalahan pada server.' : 'Error: ' + err.message);
});

module.exports = app;
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Website: http://localhost:${port}   Admin: http://localhost:${port}/admin`));
}
