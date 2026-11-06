// Skema tabel Postgres (Supabase) — dibuat otomatis dari definisi konten di lib/resources.js.
const { collections } = require('./resources');

const snake = s => s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
const col = n => (n === 'order' ? 'sort_order' : snake(n));          // "order" adalah kata cadangan SQL
const PG = { text: 'text', textarea: 'text', select: 'text', image: 'text', number: 'double precision', date: 'date', checkbox: 'boolean', timestamptz: 'timestamptz' };

// Tabel pesan (form Contact) tidak ikut dikelola lewat CRUD umum, jadi didefinisikan terpisah.
const messages = { fields: [
  { name: 'name', type: 'text' }, { name: 'email', type: 'text' }, { name: 'phone', type: 'text' },
  { name: 'message', type: 'text' }, { name: 'date', type: 'timestamptz' }, { name: 'read', type: 'checkbox' }
] };
const tables = { ...collections, messages };

// Daftar kolom { field, col, type } untuk satu tabel (termasuk kolom tambahan slug & media_type)
function columnsOf(def) {
  const out = [];
  for (const f of def.fields) {
    out.push({ field: f.name, col: col(f.name), type: f.type === 'media' ? 'text' : f.type });
    if (f.type === 'media') out.push({ field: f.name + 'Type', col: col(f.name + 'Type'), type: 'text' });
  }
  if (def.slug) out.push({ field: 'slug', col: 'slug', type: 'text' });
  return out;
}

function ddl() {
  const q = s => '"' + s + '"';
  const sql = ['-- Skema Kontraktor (dibuat otomatis oleh: npm run db:schema)', '-- Aman dijalankan berulang kali.', ''];
  for (const [name, def] of Object.entries(tables)) {
    const lines = ['  "id" text primary key'];
    for (const c of columnsOf(def)) lines.push(`  ${q(c.col)} ${PG[c.type]}${c.col === 'slug' ? ' unique' : ''}`);
    lines.push('  "created_at" timestamptz not null default now()');
    sql.push(`create table if not exists public.${q(name)} (\n${lines.join(',\n')}\n);`);
    sql.push(`alter table public.${q(name)} enable row level security;`);
    sql.push('');
  }
  sql.push('-- Pengaturan website, halaman About, dan akun admin (jsonb)');
  sql.push('create table if not exists public."site_settings" (\n  "key" text primary key,\n  "data" jsonb not null default \'{}\'::jsonb\n);');
  sql.push('alter table public."site_settings" enable row level security;', '');
  sql.push('-- RLS aktif TANPA policy: kunci "anon" Supabase tidak bisa membaca/menulis tabel ini.');
  sql.push('-- Aplikasi mengakses lewat koneksi server (DATABASE_URL) yang tidak terikat RLS.');
  return sql.join('\n') + '\n';
}
module.exports = { tables, columnsOf, col, ddl };
