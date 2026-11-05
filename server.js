const express = require('express'), session = require('express-session'), helmet = require('helmet');
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const db = require('./lib/db'), H = require('./lib/helpers');

const app = express();
const PROD = process.env.NODE_ENV === 'production';
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: PROD ? '1d' : 0 }));

// Secret session disimpan permanen agar login tidak hilang saat server restart
const secretFile = path.join(__dirname, 'data', '.secret');
let secret = process.env.SESSION_SECRET;
if (!secret) { if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex')); secret = fs.readFileSync(secretFile, 'utf8'); }
app.use(session({ name: 'kt.sid', secret, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 8 * 3600 * 1000 } }));

const assetV = () => { try { return Math.floor(fs.statSync(path.join(__dirname, 'public', 'css', 'app.css')).mtimeMs); } catch (e) { return 0; } };
app.use((req, res, next) => {
  req.session.csrf ||= crypto.randomBytes(24).toString('hex');
  req.flash = (type, msg) => (req.session.flash ||= []).push({ type, msg });
  Object.assign(res.locals, { v: assetV(), S: db.obj('settings'), footerServices: db.list('services').sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)), path: req.path, csrfToken: req.session.csrf, flash: req.session.flash || [],
    logo: (surface, cls, textCls) => H.logo(db.obj('settings'), surface, cls, textCls), fmtDate: H.fmtDate, paragraphs: H.paragraphs, pill: H.pill, media: H.media, esc: H.esc, title: null, desc: null, dark: false });
  req.session.flash = [];
  next();
});

app.use('/', require('./routes/site'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).render('site/404', { title: 'Halaman tidak ditemukan' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).send('Terjadi kesalahan pada server.'); });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Website: http://localhost:${port}   Admin: http://localhost:${port}/admin`));
