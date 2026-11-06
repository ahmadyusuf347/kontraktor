# Kontraktor – Website Profil + Dashboard Admin

Express · EJS · Tailwind CSS · Bootstrap Icons · GSAP · **Supabase (Postgres + Storage)** · siap deploy di **Vercel**.
Tampilan monokrom & responsif; logo dan foto tetap berwarna.

> **Deploy ke Vercel:** ikuti panduan lengkap di **[DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)**.

## Menjalankan di lokal
Butuh Node.js 20+ dan sebuah project Supabase (gratis).
```bash
npm install                 # otomatis menyalin aset vendor & membangun CSS
cp .env.example .env        # isi kredensial Supabase (lihat DEPLOY-VERCEL.md bagian 3-4)
npm run db:setup            # buat tabel + bucket + data awal (sekali saja)
npm start                   # http://localhost:3000   |  admin: /admin
npm run dev                 # auto-restart saat file server berubah
npm run css:watch           # (terminal lain) bangun ulang Tailwind saat edit tampilan
```

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run db:setup` | Membuat tabel (RLS aktif), bucket Storage, dan data awal. Aman diulang. |
| `npm run db:schema` | Mencetak skema SQL (`> supabase/schema.sql`) dari `lib/resources.js`. |
| `npm run db:import -- data/db.json --replace` | Memindahkan data versi lama (JSON + file upload lokal) ke Supabase. |
| `npm run build` | Menyalin aset vendor + membangun CSS (dijalankan otomatis oleh Vercel). |

## Cara kerja penyimpanan
- **Konten** → tabel Postgres di Supabase, diakses server lewat `DATABASE_URL` (RLS aktif tanpa policy, jadi kunci `anon` tidak bisa mengakses).
- **Gambar & video** → Supabase Storage (bucket publik `uploads`). Karena Vercel membatasi body request ±4,5 MB, browser admin **mengunggah langsung ke Supabase** memakai signed upload URL; server memverifikasi tipe, ukuran, dan isi file (magic bytes) saat form disimpan.
- **Sesi login** → cookie bertanda tangan (`SESSION_SECRET`), tanpa memori server.

## Struktur
```
server.js            aplikasi Express (diekspor untuk Vercel)
api/index.js         entry serverless Vercel;  vercel.json = konfigurasi deploy
routes/site.js       halaman publik, form kontak, sitemap
routes/admin.js      login, CRUD, izin unggah, pesan, akun
lib/db.js            akses Postgres (pg)      lib/schema.js   skema dari resources
lib/storage.js       Supabase Storage         lib/resources.js definisi kolom tiap konten
scripts/             db-setup, db-import, schema-sql, copy-vendor
supabase/schema.sql  skema SQL siap tempel di SQL Editor
views/               template EJS (site/, admin/, partials/)
src/input.css        sumber Tailwind  ->  public/css/app.css
```

## Dashboard admin
Hero Slides (gambar/video latar + durasi) · Statistik · Layanan · Project · Berita · Tim · Halaman About (teks, Timeline, Why Choose Us) · Pesan Masuk · Pengaturan (logo, kontak, sosmed, SEO) · Akun.
Tambah, edit, hapus, unggah gambar/video; Berita & Project bisa disembunyikan sebagai draft.

## Logo
Taruh logo berwarna di `public/images/Logo.png` (dipakai bila belum ada unggahan) atau unggah lewat **Pengaturan Website**
(kolom *Logo*; opsional *Logo untuk latar gelap*). Logo ditampilkan apa adanya tanpa filter.

## Keamanan
Password di-hash (bcrypt) · cookie sesi httpOnly + secure + signed · token CSRF di semua form · rate-limit login & kontak ·
honeypot anti-bot · verifikasi file unggahan (tipe, ukuran, magic bytes) · RLS Supabase aktif · header Helmet · output di-escape.
