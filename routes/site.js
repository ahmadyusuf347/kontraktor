const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const db = require('../lib/db'), A = require('../lib/async'), csrf = require('../lib/csrf');

const byOrder = (a, b) => (a.order ?? 9999) - (b.order ?? 9999);
const news = async () => (await db.list('news')).filter(n => n.published !== false).sort((a, b) => String(b.date).localeCompare(String(a.date)));
const projects = async () => (await db.list('projects')).filter(p => p.published !== false).sort(byOrder);

router.get('/', A(async (req, res) => {
  const [allSlides, stats, services, projs, nws] = await Promise.all([db.list('slides'), db.list('stats'), db.list('services'), projects(), news()]);
  const slides = allSlides.sort(byOrder);
  // Satu "layer" latar per media unik; slide tanpa media = latar hitam
  const layers = [], slideData = slides.map(s => {
    let l = -1;
    if (s.media) {
      l = layers.findIndex(x => x.src === s.media);
      if (l < 0) { layers.push({ src: s.media, type: s.mediaType || (/\.(mp4|webm)(\?|$)/i.test(s.media) ? 'video' : 'image') }); l = layers.length - 1; }
    }
    return { t: s.title, s: s.text, d: Math.min(60, Math.max(3, Number(s.duration) || 6)), l };
  });
  res.render('site/home', { dark: true, slides, slideData, layers, firstLayer: slideData[0] ? slideData[0].l : -1,
    stats: stats.sort(byOrder), services: services.sort(byOrder), projects: projs.slice(0, 3), news: nws.slice(0, 6) });
}));
router.get('/about', A(async (req, res) => {
  const [about, timeline, whyus] = await Promise.all([db.obj('about'), db.list('timeline'), db.list('whyus')]);
  res.render('site/about', { title: 'About Us', about, timeline: timeline.sort(byOrder), whyus: whyus.sort(byOrder) });
}));
router.get('/services', A(async (req, res) => res.render('site/services', { title: 'Services', services: (await db.list('services')).sort(byOrder) })));
router.get('/projects', A(async (req, res) => res.render('site/projects', { title: 'Project', projects: await projects() })));
router.get('/team', A(async (req, res) => res.render('site/team', { title: 'Our Team', team: (await db.list('team')).sort(byOrder) })));

router.get('/news', A(async (req, res) => {
  const per = 9, all = await news(), pages = Math.max(1, Math.ceil(all.length / per));
  const page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
  res.render('site/news', { title: 'News', items: all.slice((page - 1) * per, page * per), page, pages });
}));
router.get('/news/:slug', A(async (req, res, next) => {
  const all = await news(), item = all.find(n => n.slug === req.params.slug);
  if (!item) return next();
  res.render('site/news-detail', { title: item.title, desc: item.excerpt, item, others: all.filter(n => n.id !== item.id).slice(0, 6) });
}));

const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => { req.flash('error', 'Terlalu banyak pengiriman. Coba lagi beberapa saat lagi.'); res.redirect('/contact'); } });
router.get('/contact', (req, res) => { res.set('Cache-Control', 'no-store'); res.locals.csrfToken = csrf.ensure(req); res.render('site/contact', { title: 'Contact', form: {}, errors: [] }); });
router.post('/contact', contactLimit, A(async (req, res) => {
  if (!csrf.verify(req, req.body._csrf)) return res.status(403).send('Token tidak valid. Muat ulang halaman.');
  if (req.body.website) return res.redirect('/contact'); // honeypot untuk bot
  const f = { name: String(req.body.name || '').trim().slice(0, 100), email: String(req.body.email || '').trim().slice(0, 150),
    phone: String(req.body.phone || '').trim().slice(0, 30), message: String(req.body.message || '').trim().slice(0, 3000) };
  const errors = [];
  if (!f.name) errors.push('Nama wajib diisi.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.push('Email tidak valid.');
  if (f.message.length < 10) errors.push('Pesan minimal 10 karakter.');
  if (errors.length) { res.locals.csrfToken = csrf.ensure(req); return res.status(400).render('site/contact', { title: 'Contact', form: f, errors }); }
  await db.add('messages', { ...f, date: new Date().toISOString(), read: false });
  req.flash('success', 'Terima kasih! Pesan Anda sudah kami terima dan akan segera kami balas.');
  res.redirect('/contact');
}));

router.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`));
router.get('/sitemap.xml', A(async (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = ['/', '/about', '/services', '/projects', '/team', '/news', '/contact', ...(await news()).map(n => '/news/' + n.slug)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>`);
}));
module.exports = router;
