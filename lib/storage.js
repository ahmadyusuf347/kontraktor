// Penyimpanan file (gambar/video) di Supabase Storage.
// Karena Vercel membatasi body request ±4,5 MB, file TIDAK diunggah lewat server:
// server hanya membuat "signed upload URL", browser mengunggah langsung ke Supabase,
// lalu server memverifikasi file (tipe, ukuran, magic bytes) saat form disimpan.
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = process.env.SUPABASE_BUCKET || 'uploads';
const MB = 1024 * 1024;
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm' };
const LIMIT = { image: 5 * MB, video: 50 * MB };

const need = k => { if (!process.env[k]) throw new Error(`${k} belum diatur (lihat .env.example).`); return process.env[k]; };
let client;
const sb = () => client ||= createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
const base = () => `${need('SUPABASE_URL').replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/`;
const pathFromUrl = u => (typeof u === 'string' && u.startsWith(base()) ? u.slice(base().length) : null);
const PATH_RE = /^\d{4}\/\d{2}\/[a-f0-9]{24}\.(jpg|png|webp|gif|mp4|webm)$/;

// Pastikan bucket publik ada (dipanggil oleh npm run db:setup)
async function ensureBucket() {
  const opts = { public: true, fileSizeLimit: LIMIT.video, allowedMimeTypes: Object.keys(EXT) };
  const { error } = await sb().storage.createBucket(BUCKET, opts);
  if (error && !/exists|duplicate/i.test(error.message)) throw error;
  if (error) { const r = await sb().storage.updateBucket(BUCKET, opts); if (r.error) throw r.error; }
  return BUCKET;
}
const newPath = ext => { const d = new Date(); return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomBytes(12).toString('hex')}${ext}`; };

// Minta izin unggah langsung dari browser
async function signUpload(type) {
  const p = newPath(EXT[type]);
  const { data, error } = await sb().storage.from(BUCKET).createSignedUploadUrl(p);
  if (error) throw error;
  return { bucket: BUCKET, path: p, token: data.token, publicUrl: base() + p };
}
// Unggah dari server (dipakai skrip impor)
async function uploadBuffer(buf, type) {
  const p = newPath(EXT[type]);
  const { error } = await sb().storage.from(BUCKET).upload(p, buf, { contentType: type, upsert: false });
  if (error) throw error;
  return base() + p;
}
async function remove(urls) {
  const paths = (Array.isArray(urls) ? urls : [urls]).map(pathFromUrl).filter(Boolean);
  if (paths.length) { const { error } = await sb().storage.from(BUCKET).remove(paths); if (error) console.error('[storage] gagal hapus:', error.message); }
}

// Verifikasi file yang sudah diunggah browser: URL harus milik bucket kita, tipe & ukuran sesuai, isi file cocok formatnya.
async function verify(url, { allowVideo = false } = {}) {
  const p = pathFromUrl(url);
  if (!p || !PATH_RE.test(p)) return { ok: false, error: 'Alamat media tidak valid.' };
  const ext = p.split('.').pop(), video = ext === 'mp4' || ext === 'webm';
  if (video && !allowVideo) { await remove(url); return { ok: false, error: 'Video tidak diizinkan pada kolom ini.' }; }
  let res;
  try { res = await fetch(url, { headers: { Range: 'bytes=0-11' } }); } catch (e) { return { ok: false, error: 'Gagal memeriksa file di penyimpanan.' }; }
  if (res.status !== 200 && res.status !== 206) return { ok: false, error: 'File belum ditemukan di penyimpanan. Coba unggah ulang.' };
  const cr = res.headers.get('content-range');
  const total = cr ? Number(cr.split('/')[1]) : Number(res.headers.get('content-length'));
  let buf = Buffer.alloc(0); const reader = res.body.getReader();
  while (buf.length < 12) { const { done, value } = await reader.read(); if (done) break; buf = Buffer.concat([buf, Buffer.from(value)]); }
  reader.cancel().catch(() => {});
  const hex = buf.toString('hex'), a4 = buf.toString('latin1', 0, 4);
  const magic = { jpg: hex.startsWith('ffd8ff'), png: hex.startsWith('89504e47'), gif: a4 === 'GIF8',
    webp: a4 === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP', mp4: buf.toString('latin1', 4, 8) === 'ftyp', webm: hex.startsWith('1a45dfa3') }[ext];
  const kind = video ? 'video' : 'image';
  if (!magic) { await remove(url); return { ok: false, error: 'Isi file tidak sesuai dengan formatnya.' }; }
  if (!Number.isFinite(total) || total > LIMIT[kind]) { await remove(url); return { ok: false, error: kind === 'video' ? 'Ukuran video maksimal 50 MB.' : 'Ukuran gambar maksimal 5 MB.' }; }
  return { ok: true, kind };
}
module.exports = { BUCKET, EXT, LIMIT, ensureBucket, signUpload, uploadBuffer, remove, verify, pathFromUrl };
