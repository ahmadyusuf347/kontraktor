// Definisi semua konten yang bisa dikelola di dashboard admin.
const order = { name: 'order', label: 'Urutan', type: 'number', hint: 'Angka kecil tampil lebih dulu. Kosongkan untuk ditaruh paling akhir.' };
const published = { name: 'published', label: 'Tampilkan di website', type: 'checkbox', default: true };
const CATS = ['Residential', 'Interior', 'Structural', 'Commercial'];

const collections = {
  slides: { label: 'Hero Slides', singular: 'Slide', icon: 'bi-images', sort: 'order', cols: ['media', 'title', 'duration'],
    fields: [{ name: 'title', label: 'Judul', type: 'text', required: true }, { name: 'text', label: 'Deskripsi', type: 'textarea' },
      { name: 'media', label: 'Gambar / video latar slide', type: 'media', hint: 'Gambar (JPG/PNG/WebP, maks. 5 MB) atau video (MP4 H.264 / WebM, maks. 50 MB). Kosongkan untuk memakai video bawaan public/videos/heroes-home.mp4 bila ada.' },
      { name: 'duration', label: 'Durasi tampil (detik)', type: 'number', hint: 'Antara 3 dan 60 detik. Kosongkan = 6 detik.' }, order] },
  stats: { label: 'Statistik', singular: 'Statistik', icon: 'bi-bar-chart-line', sort: 'order', cols: ['value', 'suffix', 'label'],
    fields: [{ name: 'value', label: 'Angka', type: 'number', required: true }, { name: 'suffix', label: 'Akhiran (mis. + atau %)', type: 'text' }, { name: 'label', label: 'Label', type: 'text', required: true }, order] },
  services: { label: 'Layanan', singular: 'Layanan', icon: 'bi-tools', sort: 'order', cols: ['image', 'title', 'icon'],
    fields: [{ name: 'title', label: 'Nama layanan', type: 'text', required: true },
      { name: 'icon', label: 'Ikon Bootstrap', type: 'text', default: 'bi-house-door', hint: 'Contoh: bi-house-door, bi-lamp, bi-bricks. Daftar ikon: icons.getbootstrap.com' },
      { name: 'description', label: 'Deskripsi', type: 'textarea' }, { name: 'image', label: 'Gambar', type: 'image' }, order] },
  projects: { label: 'Project', singular: 'Project', icon: 'bi-building', sort: 'order', slug: true, cols: ['image', 'title', 'category', 'published'],
    fields: [{ name: 'title', label: 'Nama project', type: 'text', required: true }, { name: 'category', label: 'Kategori', type: 'select', options: CATS },
      { name: 'location', label: 'Lokasi', type: 'text' }, { name: 'year', label: 'Tahun', type: 'text' },
      { name: 'description', label: 'Deskripsi', type: 'textarea' }, { name: 'image', label: 'Gambar', type: 'image' }, published, order] },
  news: { label: 'Berita', singular: 'Berita', icon: 'bi-newspaper', sort: 'date', slug: true, cols: ['image', 'title', 'date', 'published'],
    fields: [{ name: 'title', label: 'Judul', type: 'text', required: true }, { name: 'date', label: 'Tanggal', type: 'date', required: true },
      { name: 'excerpt', label: 'Ringkasan (tampil di kartu)', type: 'textarea' },
      { name: 'content', label: 'Isi berita', type: 'textarea', rows: 10, hint: 'Pisahkan paragraf dengan satu baris kosong.' },
      { name: 'image', label: 'Gambar utama', type: 'image' }, { name: 'g1', label: 'Galeri 1', type: 'image' }, { name: 'g2', label: 'Galeri 2', type: 'image' }, { name: 'g3', label: 'Galeri 3', type: 'image' }, published] },
  team: { label: 'Tim', singular: 'Anggota tim', icon: 'bi-people', sort: 'order', cols: ['photo', 'name', 'role'],
    fields: [{ name: 'name', label: 'Nama', type: 'text', required: true }, { name: 'role', label: 'Jabatan', type: 'text', required: true }, { name: 'photo', label: 'Foto (rasio potret)', type: 'image' }, order] },
  timeline: { label: 'Timeline', singular: 'Timeline', icon: 'bi-clock-history', sort: 'order', cols: ['year', 'label'],
    fields: [{ name: 'year', label: 'Tahun', type: 'text', required: true }, { name: 'label', label: 'Keterangan (opsional)', type: 'text' }, order] },
  whyus: { label: 'Why Choose Us', singular: 'Keunggulan', icon: 'bi-patch-check', sort: 'order', cols: ['title', 'text'],
    fields: [{ name: 'title', label: 'Judul', type: 'text', required: true }, { name: 'text', label: 'Deskripsi', type: 'textarea' }, order] }
};

const singles = {
  settings: { label: 'Pengaturan Website', icon: 'bi-gear', fields: [
    { name: 'siteName', label: 'Nama perusahaan', type: 'text', required: true },
    { name: 'logo', label: 'Logo (untuk latar terang)', type: 'image', hint: 'Kosongkan untuk memakai public/images/Logo.png. Logo tampil berwarna apa adanya.' },
    { name: 'logoDark', label: 'Logo untuk latar gelap (opsional)', type: 'image', hint: 'Dipakai di header Home, footer, dan sidebar admin. Kosongkan bila tidak ada: logo utama akan ditampilkan pada lencana putih.' },
    { name: 'logoStyle', label: 'Tampilan logo di latar gelap bila tidak ada versi gelap', type: 'select', options: ['Apa adanya', 'Lencana putih'], hint: 'Logo.png dianggap berlatar gelap (tulisan putih) dan ditampilkan langsung. Pilih "Lencana putih" hanya bila logo Anda bertulisan gelap: logo ditaruh di kotak putih kecil.' },
    { name: 'heroImage', label: 'Foto hero (halaman Home)', type: 'image' },
    { name: 'metaDescription', label: 'Deskripsi SEO', type: 'textarea', rows: 2 },
    { name: 'footerText', label: 'Teks footer', type: 'textarea', rows: 2 },
    { name: 'ctaTitle', label: 'Judul ajakan konsultasi', type: 'text' },
    { name: 'phone', label: 'Telepon', type: 'text' }, { name: 'whatsapp', label: 'WhatsApp (format 62…, tanpa + / spasi)', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' }, { name: 'address', label: 'Alamat', type: 'text' }, { name: 'city', label: 'Kota (top bar)', type: 'text' },
    { name: 'instagram', label: 'Link Instagram', type: 'text' }, { name: 'facebook', label: 'Link Facebook', type: 'text' }, { name: 'youtube', label: 'Link YouTube', type: 'text' }] },
  about: { label: 'Halaman About Us', icon: 'bi-info-circle', fields: [
    { name: 'history', label: 'Sejarah singkat', type: 'textarea', rows: 6 },
    { name: 'vision', label: 'Vision', type: 'textarea', rows: 5 }, { name: 'mission', label: 'Mission', type: 'textarea', rows: 5 },
    { name: 'licenseText', label: 'Izin Resmi & Lisensi', type: 'textarea', rows: 4 }, { name: 'isoImage', label: 'Gambar lisensi/ISO', type: 'image' },
    { name: 'certText', label: 'Sertifikat & Penghargaan', type: 'textarea', rows: 4 }, { name: 'certImage', label: 'Gambar sertifikat', type: 'image' }] }
};
module.exports = { collections, singles };
