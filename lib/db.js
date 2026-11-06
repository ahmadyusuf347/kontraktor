// Akses data ke Supabase (PostgreSQL) lewat koneksi `pg` — async, cocok untuk serverless (Vercel).
const { Pool, types } = require('pg');
const crypto = require('crypto');
const { tables, columnsOf } = require('./schema');

types.setTypeParser(1082, v => v);                          // date -> 'YYYY-MM-DD' (bukan Date)
types.setTypeParser(1184, v => new Date(v).toISOString());  // timestamptz -> ISO string

let pool;
const getPool = () => {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diatur. Isi di file .env (lokal) atau Environment Variables (Vercel).');
  pool = new Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX || 3),
    idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }   // Supabase mewajibkan SSL
  });
  pool.on('error', e => console.error('[pg] koneksi idle error:', e.message));
  return pool;
};
const query = (text, params) => getPool().query(text, params);

const newId = () => crypto.randomBytes(5).toString('hex');
const q = s => '"' + s + '"';
const tableOf = name => { const t = tables[name]; if (!t) throw new Error('Tabel tidak dikenal: ' + name); return { t, cols: columnsOf(t) }; };

// nilai JS -> nilai kolom
const toDb = (c, v) => {
  if (c.type === 'checkbox') return v === true || v === 'true';
  if (c.type === 'number') return v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  if (c.type === 'date' || c.type === 'timestamptz') return v ? v : null;
  return v == null ? '' : String(v);
};
// baris -> objek aplikasi (nama field asli)
const fromDb = (cols, row) => {
  const o = { id: row.id };
  for (const c of cols) o[c.field] = row[c.col] ?? (c.type === 'checkbox' ? false : (c.type === 'number' || c.type === 'date' ? null : ''));
  return o;
};

// Cache singkat per instance (mengurangi query berulang untuk data yang dipakai di setiap halaman)
const memo = new Map(); const TTL = Number(process.env.CACHE_TTL_MS || 10000);
const cached = async (key, fn) => { const m = memo.get(key); if (m && Date.now() - m.t < TTL) return m.v; const v = await fn(); memo.set(key, { t: Date.now(), v }); return v; };
const invalidate = () => memo.clear();

const db = {
  query, invalidate, newId,
  async list(name) { const { cols } = tableOf(name); const r = await query(`select * from ${q(name)}`); return r.rows.map(row => fromDb(cols, row)); },
  async get(name, id) { const { cols } = tableOf(name); const r = await query(`select * from ${q(name)} where id = $1`, [id]); return r.rows[0] ? fromDb(cols, r.rows[0]) : null; },
  async count(name) { tableOf(name); const r = await query(`select count(*)::int as n from ${q(name)}`); return r.rows[0].n; },
  async add(name, item) {
    const { cols } = tableOf(name); item.id = item.id || newId();
    const use = cols.filter(c => item[c.field] !== undefined);
    const names = ['id', ...use.map(c => c.col)], vals = [item.id, ...use.map(c => toDb(c, item[c.field]))];
    await query(`insert into ${q(name)} (${names.map(q).join(',')}) values (${names.map((_, i) => '$' + (i + 1)).join(',')})`, vals);
    invalidate(); return item;
  },
  async update(name, id, patch) {
    const { cols } = tableOf(name); const use = cols.filter(c => patch[c.field] !== undefined);
    if (!use.length) return this.get(name, id);
    const r = await query(`update ${q(name)} set ${use.map((c, i) => `${q(c.col)} = $${i + 1}`).join(',')} where id = $${use.length + 1} returning *`,
      [...use.map(c => toDb(c, patch[c.field])), id]);
    invalidate(); return r.rows[0] ? fromDb(cols, r.rows[0]) : null;
  },
  async remove(name, id) { tableOf(name); const r = await query(`delete from ${q(name)} where id = $1`, [id]); invalidate(); return r.rowCount > 0; },
  async clear(name) { tableOf(name); await query(`delete from ${q(name)}`); invalidate(); },

  // Objek tunggal: settings, about, admin (tabel site_settings, kolom jsonb)
  async obj(key) { const r = await query('select data from site_settings where key = $1', [key]); return r.rows[0] ? r.rows[0].data : {}; },
  async setObj(key, val) {
    await query(`insert into site_settings (key, data) values ($1, $2::jsonb) on conflict (key) do update set data = excluded.data`, [key, JSON.stringify(val)]);
    invalidate();
  },
  hasObj: async key => (await query('select 1 from site_settings where key = $1', [key])).rowCount > 0,

  // Dipakai di setiap halaman -> di-cache singkat
  settings: () => cached('settings', () => db.obj('settings')),
  footerServices: () => cached('footerServices', async () => (await db.list('services')).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))),
  end: async () => { if (pool) { await pool.end(); pool = null; } }
};
module.exports = db;
