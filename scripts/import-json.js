// Memindahkan data dari versi lama (data/db.json + public/uploads) ke Supabase.
//   npm run db:import                    -> baca data/db.json
//   npm run db:import -- path/ke/db.json --replace   (hapus isi lama di Supabase, lalu impor)
require('dotenv').config();
const fs = require('fs'), path = require('path');
const db = require('../lib/db'), storage = require('../lib/storage');
const { collections, singles } = require('../lib/resources');

const root = path.join(__dirname, '..');
const file = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(root, 'data', 'db.json');
const replace = process.argv.includes('--replace');
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const cache = new Map();

// /uploads/xxx.png (lokal) -> URL publik di Supabase Storage
async function moveFile(rel) {
  if (!rel || !rel.startsWith('/uploads/') && !rel.startsWith('/videos/')) return rel;
  if (cache.has(rel)) return cache.get(rel);
  const abs = path.join(root, 'public', rel);
  const type = MIME[path.extname(rel).toLowerCase()];
  if (!fs.existsSync(abs) || !type) { console.warn('  ! lewati (file tidak ada / format tidak didukung):', rel); return ''; }
  const url = await storage.uploadBuffer(fs.readFileSync(abs), type);
  cache.set(rel, url); console.log('  ↑', rel, '->', url.split('/').slice(-3).join('/')); return url;
}
const isVideo = u => /\.(mp4|webm)$/i.test(u || '');

(async () => {
  if (!fs.existsSync(file)) throw new Error('File tidak ditemukan: ' + file);
  const old = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!replace && await db.hasObj('settings')) throw new Error('Supabase sudah berisi data. Jalankan ulang dengan --replace untuk menimpa.');

  for (const [name, def] of Object.entries(collections)) {
    await db.clear(name);
    for (const item of old[name] || []) {
      for (const f of def.fields.filter(f => f.type === 'image' || f.type === 'media')) {
        item[f.name] = await moveFile(item[f.name]);
        if (f.type === 'media') item[f.name + 'Type'] = item[f.name] ? (isVideo(item[f.name]) ? 'video' : 'image') : '';
      }
      await db.add(name, item);
    }
    console.log(`✓ ${name}: ${(old[name] || []).length} data`);
  }
  // video bawaan lama -> slide pertama yang belum punya media
  const def = path.join(root, 'public', 'videos', 'heroes-home.mp4');
  if (fs.existsSync(def)) {
    const slides = (await db.list('slides')).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const first = slides.find(s => !s.media);
    if (first) { const url = await moveFile('/videos/heroes-home.mp4'); await db.update('slides', first.id, { media: url, mediaType: 'video' }); console.log('✓ heroes-home.mp4 dipasang pada slide:', first.title); }
  }
  for (const [key, d] of Object.entries(singles)) {
    const o = old[key] || {};
    for (const f of d.fields.filter(f => f.type === 'image')) o[f.name] = await moveFile(o[f.name]);
    await db.setObj(key, o); console.log('✓', key);
  }
  if (old.admin) { await db.setObj('admin', old.admin); console.log('✓ akun admin (username & password lama dipertahankan)'); }
  for (const m of old.messages || []) await db.add('messages', m);
  console.log(`✓ messages: ${(old.messages || []).length} data\nSelesai.`);
})().catch(e => { console.error('\nGAGAL:', e.message); process.exitCode = 1; }).finally(() => db.end());
