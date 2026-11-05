# Kontraktor – Website Profil + Dashboard Admin

Node.js · Express · EJS · Tailwind CSS · Bootstrap Icons · GSAP · tampilan monokrom (logo & foto tetap berwarna) & responsif.

## Menjalankan
```bash
npm install        # otomatis menyalin aset vendor & membangun CSS (postinstall)
npm start          # http://localhost:3000
npm run dev        # auto-restart saat file server berubah
npm run css:watch  # (terminal lain) bangun ulang Tailwind saat edit tampilan
```
Admin: **http://localhost:3000/admin** — login awal `admin` / `admin123` (**segera ganti** di menu *Akun Admin*).

## Logo (berwarna)
Taruh logo berwarna di `public/images/Logo.png` (atau unggah lewat *Pengaturan Website*). Logo ditampilkan apa adanya, tanpa filter.
- `Logo.png` dipakai di latar terang (header halaman dalam, halaman login).
- Latar gelap (header Home, footer, sidebar admin) memakai `public/images/Logo-dark.png` bila ada
  (versi dengan tulisan putih) atau unggahan "Logo untuk latar gelap" di Pengaturan.
  Jika tidak ada, `Logo.png` otomatis ditaruh pada lencana putih agar tetap terbaca.
Bila file logo tidak ditemukan, tampil nama perusahaan.

## Video hero (Home)
Taruh video di `public/videos/heroes-home.mp4`. Video diputar otomatis, tanpa suara, berulang, dengan lapisan gelap tipis agar teks terbaca.
Tanpa file ini, hero tampil hitam polos. Saran: H.264, 1280x720 atau 1920x1080, 8-15 detik, tanpa audio, di bawah ~8 MB.
Pengguna dengan pengaturan "reduce motion" tidak diputarkan videonya.

## Fitur dashboard (sidebar)
Dashboard (ringkasan) · Hero Slides · Statistik · Layanan · Project · Berita · Tim ·
Halaman About (teks, Timeline, Why Choose Us) · Pesan Masuk (dari form Contact) · Pengaturan (logo, kontak, sosmed, SEO) · Akun.
Setiap konten bisa ditambah, diedit, dihapus, diunggah gambarnya, dan (Berita/Project) disembunyikan sebagai draft.

## Struktur
```
server.js            entri aplikasi
routes/site.js       halaman publik, form kontak, sitemap
routes/admin.js      login, CRUD, upload, pesan, akun
lib/resources.js     definisi kolom tiap konten (ubah di sini untuk menambah field)
lib/db.js            penyimpanan JSON (data/db.json, dibuat otomatis saat pertama jalan)
views/               template EJS (site/, admin/, partials/)
src/input.css        sumber Tailwind  ->  public/css/app.css
public/uploads/      gambar unggahan admin
```

## Deploy
GitHub Pages **tidak bisa** menjalankan Node.js. Gunakan VPS (Nginx + PM2), Render, Railway, Fly.io, dsb.
Penting: folder `data/` dan `public/uploads/` harus berada di **penyimpanan permanen** (persistent disk/volume),
dan di-backup berkala. Set variabel pada `.env.example` (terutama `SESSION_SECRET`, `COOKIE_SECURE`, `TRUST_PROXY`).

## Keamanan yang sudah ada
Password di-hash (bcrypt) · session cookie httpOnly · token CSRF di semua form · rate-limit login & kontak ·
honeypot anti-bot · validasi & batas ukuran/tipe upload (JPG/PNG/WebP/GIF, 5 MB) · header Helmet · output di-escape.
