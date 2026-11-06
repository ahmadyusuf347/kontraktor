// Menyiapkan Supabase: tabel + RLS, bucket Storage, dan data awal.
//   npm run db:setup              -> tabel, bucket, dan data awal (jika belum ada)
//   npm run db:setup -- --no-seed -> tanpa data awal
// Opsional: ADMIN_USERNAME / ADMIN_PASSWORD untuk akun admin awal (default admin / admin123).
require('dotenv').config();
const db = require('../lib/db'), storage = require('../lib/storage'), seed = require('../lib/seed'), { ddl, tables } = require('../lib/schema');

(async () => {
  console.log('1/3 Membuat tabel…'); await db.query(ddl()); console.log('    OK');
  console.log('2/3 Menyiapkan bucket Storage…'); console.log('    OK, bucket: ' + await storage.ensureBucket());
  if (process.argv.includes('--no-seed')) { console.log('3/3 Data awal dilewati (--no-seed).'); return; }
  if (await db.hasObj('settings')) { console.log('3/3 Data sudah ada, tidak diisi ulang.'); return; }
  console.log('3/3 Mengisi data awal…');
  const data = seed({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  for (const k of ['settings', 'about', 'admin']) await db.setObj(k, data[k]);
  for (const name of Object.keys(tables)) for (const item of data[name] || []) await db.add(name, item);
  const usingDefault = !process.env.ADMIN_PASSWORD;
  console.log(`    OK. Login admin: ${data.admin.username} / ${usingDefault ? 'admin123  (SEGERA GANTI di menu Akun Admin!)' : '(sesuai ADMIN_PASSWORD)'}`);
})().catch(e => { console.error('\nGAGAL:', e.message); process.exitCode = 1; }).finally(() => db.end());
