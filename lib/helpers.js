const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : ''; };
const paragraphs = t => String(t || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const slugify = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';

// Tombol pill monokrom. variant: 'dark' (hitam) | 'light' (putih)
const pill = (label, href, variant = 'dark', extra = '') => {
  const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
  const v = variant === 'dark' ? 'bg-black text-white hover:bg-neutral-700' : 'bg-white text-black hover:bg-neutral-200';
  const c = variant === 'dark' ? 'bg-white text-black' : 'bg-black text-white';
  return `<a href="${esc(href)}"${ext} class="inline-flex items-center justify-between gap-4 ${v} transition-colors rounded-full pl-5 pr-1 py-1 text-sm font-medium whitespace-nowrap ${extra}">${esc(label)}<span class="w-8 h-8 rounded-full ${c} grid place-items-center shrink-0"><i class="bi bi-chevron-right"></i></span></a>`;
};
// Gambar atau placeholder abu-abu bila belum ada
const media = (src, alt, cls = '', icon = 'bi-image') => src
  ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" class="${cls}">`
  : `<div class="${cls} bg-neutral-200 text-neutral-400 grid place-items-center" role="img" aria-label="${esc(alt)}"><i class="bi ${icon} text-4xl"></i></div>`;

// Logo berwarna apa adanya (tanpa filter). Dianggap untuk latar GELAP (tulisan putih).
// surface 'dark' memakai logoDark (unggahan di Pengaturan) bila ada; selain itu logo utama / public/images/Logo.png.
// Lencana putih HANYA bila pengaturan logoStyle = 'Lencana putih' (untuk logo bertulisan gelap).
const logo = (S, surface = 'dark', h = 36, hMd, textCls = 'text-xl md:text-2xl') => {
  hMd = hMd || h;
  let src = S.logo || '/images/Logo.png', badge = false;
  if (surface === 'dark') {
    if (S.logoDark) src = S.logoDark;
    else badge = S.logoStyle === 'Lencana putih';
  }
  if (badge) { h -= 8; hMd -= 8; }
  const fail = "var w=this.closest('[data-logo-wrap]');w.querySelector('[data-logo-box]').classList.add('hidden');var t=w.querySelector('[data-logo-text]');t.classList.remove('hidden');t.classList.add('flex')";
  const img = `<img src="${esc(src)}" alt="${esc(S.siteName)}" class="logo-img" style="--lh:${h}px;--lhm:${hMd}px" onerror="${fail}">`;
  const box = `<span data-logo-box class="inline-flex items-center ${badge ? 'bg-white rounded-lg px-2.5 py-1.5' : ''}">${img}</span>`;
  return `<span data-logo-wrap class="inline-flex items-center">${box}<span data-logo-text class="hidden items-center gap-2 font-bold tracking-tight ${textCls}"><i class="bi bi-buildings"></i>${esc(S.siteName)}</span></span>`;
};

module.exports = { logo, esc, fmtDate, paragraphs, slugify, pill, media };
