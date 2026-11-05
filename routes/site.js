const router = require('express').Router();
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const rateLimit = require('express-rate-limit');
const db = require('../lib/db');

const byOrder = (a, b) => (a.order ?? 9999) - (b.order ?? 9999);
const pub = name => db.list(name).filter(i => i.published !== false);
const news = () => pub('news').sort((a, b) => String(b.date).localeCompare(String(a.date)));
const projects = () => pub('projects').sort(byOrder);

router.get('/', (req, res) => {
  res.render('site/home', { dark: true, hasVideo: fs.existsSync(path.join(__dirname, '..', 'public', 'videos', 'heroes-home.mp4')), slides: db.list('slides').sort(byOrder), stats: db.list('stats').sort(byOrder),
    services: db.list('services').sort(byOrder), projects: projects().slice(0, 3), news: news().slice(0, 6) });
});
router.get('/about', (req, res) => res.render('site/about', { title: 'About Us', about: db.obj('about'),
  timeline: db.list('timeline').sort(byOrder), whyus: db.list('whyus').sort(byOrder) }));
router.get('/services', (req, res) => res.render('site/services', { title: 'Services', services: db.list('services').sort(byOrder) }));
router.get('/projects', (req, res) => res.render('site/projects', { title: 'Project', projects: projects() }));
router.get('/team', (req, res) => res.render('site/team', { title: 'Our Team', team: db.list('team').sort(byOrder) }));

router.get('/news', (req, res) => {
  const per = 9, all = news(), pages = Math.max(1, Math.ceil(all.length / per));
  const page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
  res.render('site/news', { title: 'News', items: all.slice((page - 1) * per, page * per), page, pages });
});
router.get('/news/:slug', (req, res, next) => {
  const item = news().find(n => n.slug === req.params.slug);
  if (!item) return next();
  res.render('site/news-detail', { title: item.title, desc: item.excerpt, item, others: news().filter(n => n.id !== item.id).slice(0, 6) });
});

const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => { req.flash('error', 'Terlalu banyak pengiriman. Coba lagi beberapa saat lagi.'); res.redirect('/contact'); } });
router.get('/contact', (req, res) => res.render('site/contact', { title: 'Contact', form: {}, errors: [] }));
router.post('/contact', contactLimit, (req, res) => {
  const t = String(req.body._csrf || ''), ok = req.session.csrf && t.length === req.session.csrf.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(req.session.csrf));
  if (!ok) return res.status(403).send('Token tidak valid. Muat ulang halaman.');
  if (req.body.website) return res.redirect('/contact'); // honeypot untuk bot
  const f = { name: String(req.body.name || '').trim().slice(0, 100), email: String(req.body.email || '').trim().slice(0, 150),
    phone: String(req.body.phone || '').trim().slice(0, 30), message: String(req.body.message || '').trim().slice(0, 3000) };
  const errors = [];
  if (!f.name) errors.push('Nama wajib diisi.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.push('Email tidak valid.');
  if (f.message.length < 10) errors.push('Pesan minimal 10 karakter.');
  if (errors.length) return res.status(400).render('site/contact', { title: 'Contact', form: f, errors });
  db.add('messages', { ...f, date: new Date().toISOString(), read: false });
  req.flash('success', 'Terima kasih! Pesan Anda sudah kami terima dan akan segera kami balas.');
  res.redirect('/contact');
});

router.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`));
router.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = ['/', '/about', '/services', '/projects', '/team', '/news', '/contact', ...news().map(n => '/news/' + n.slug)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>`);
});
module.exports = router;
