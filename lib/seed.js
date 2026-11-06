const bcrypt = require('bcryptjs');
const L = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis';
let n = 0; const id = () => 'seed' + (++n).toString(36);
module.exports = (opts = {}) => ({
  admin: { username: opts.username || 'admin', passwordHash: bcrypt.hashSync(opts.password || 'admin123', 10) },
  settings: {
    siteName: 'Kontraktor', metaDescription: 'Mitra terpercaya untuk pembangunan komersial, hunian modern, dan infrastruktur.',
    phone: '085-0999-8888', whatsapp: '628509998888', email: 'sales@kontraktor.co.id',
    address: 'Jakarta, Indonesia', city: 'Jakarta - Indonesia',
    instagram: '#', facebook: '#', youtube: '#', logo: '', logoDark: '', logoStyle: 'Apa adanya', heroImage: '',
    ctaTitle: 'Konsultasikan Proyek Anda Sekarang',
    footerText: 'Mitra terpercaya untuk pembangunan komersial, hunian modern, dan infrastruktur.'
  },
  about: { history: L + ' ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore', vision: L, mission: L, licenseText: L, certText: L, isoImage: '', certImage: '' },
  slides: [
    { id: id(), order: 1, media: '', mediaType: '', duration: 6, title: 'Building Your Vision with Precision, Quality, and Integrity.', text: 'Your trusted partner for commercial developments, modern residential projects, and infrastructure—built to the highest standards and delivered on schedule.' },
    { id: id(), order: 2, media: '', mediaType: '', duration: 6, title: 'Interior yang Rapi, Hunian yang Nyaman.', text: 'Dari perencanaan hingga finishing, kami mewujudkan ruang impian Anda dengan detail yang presisi.' },
    { id: id(), order: 3, media: '', mediaType: '', duration: 6, title: 'Perbaikan Struktur yang Aman dan Tahan Lama.', text: 'Tim insinyur kami menangani retrofit dan perbaikan struktur sesuai standar keselamatan.' }
  ],
  stats: [
    { id: id(), order: 1, value: 15, suffix: '+', label: 'Tahun Pengalaman' },
    { id: id(), order: 2, value: 250, suffix: '+', label: 'Proyek Selesai' },
    { id: id(), order: 3, value: 40, suffix: '+', label: 'Tenaga Ahli' },
    { id: id(), order: 4, value: 100, suffix: '%', label: 'Klien Puas' }
  ],
  services: [
    { id: id(), order: 1, title: 'Residential', icon: 'bi-house-door', description: L, image: '' },
    { id: id(), order: 2, media: '', mediaType: '', duration: 6, title: 'Interior Designs', icon: 'bi-lamp', description: L, image: '' },
    { id: id(), order: 3, title: 'Structural Repair', icon: 'bi-bricks', description: L, image: '' }
  ],
  projects: [
    ['Residential', 'Town House Cluster Aster'], ['Interior', 'Interior Rumah Pak Syahroni'], ['Structural', 'Perbaikan Struktur Ruko Kelapa Gading'],
    ['Residential', 'Hunian Green Kreasi'], ['Commercial', 'Perkantoran Semanggi'], ['Interior', 'Kitchen Set Apartemen Skyline']
  ].map(([category, title], i) => ({ id: id(), order: i + 1, title, slug: 'project-' + (i + 1), category, location: 'Jakarta', year: '2026', description: L, image: '', published: true })),
  news: [
    ['2026-10-20', 'Progress Interior Rumah Pak Syahroni', 'interior-rumah-pak-syahroni'], ['2026-11-30', 'Progress Pembangunan Perkantoran Semanggi', 'perkantoran-semanggi'],
    ['2026-10-09', 'Progress Pembangunan Hunian Green Kreasi', 'hunian-green-kreasi'], ['2026-09-25', 'Renovasi Gedung Sekolah Tahap Akhir', 'renovasi-gedung-sekolah'],
    ['2026-09-12', 'Perbaikan Struktur Ruko Kelapa Gading', 'perbaikan-struktur-ruko'], ['2026-09-01', 'Serah Terima Town House Cluster Aster', 'serah-terima-town-house']
  ].map(([date, title, slug]) => ({ id: id(), title, slug, date, excerpt: L, content: [L, L, L].join('\n\n'), image: '', g1: '', g2: '', g3: '', published: true })),
  team: [['Sarah Azzahra', 'Cief Executive Officer'], ['Lissa Rosandi', 'Directur Finance'], ['Ridwan Benzema', 'Cief Technical Officer'], ['Yusuf Ahmad', 'Seniors Architect'], ['Rini Dwi Lestari', 'Operational']]
    .map(([name, role], i) => ({ id: id(), order: i + 1, name, role, photo: '' })),
  timeline: [['2011', 'Berdiri'], ['2015', ''], ['2020', ''], ['2024', ''], ['2026', '']].map(([year, label], i) => ({ id: id(), order: i + 1, year, label })),
  whyus: ['15 Tahun Pengalaman', 'Garansi Konstruksi', 'Transparansi Biaya', 'Ketepatan Waktu'].map((title, i) => ({ id: id(), order: i + 1, title, text: L })),
  messages: []
});
