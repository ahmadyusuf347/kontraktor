(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // Sidebar responsif
  const side = $('#sidebar'), ov = $('#sideOverlay');
  const toggle = o => { side.classList.toggle('-translate-x-full', !o); ov.classList.toggle('hidden', !o); document.body.classList.toggle('overflow-hidden', o); };
  $('#sideOpen')?.addEventListener('click', () => toggle(true));
  $('#sideClose')?.addEventListener('click', () => toggle(false));
  ov?.addEventListener('click', () => toggle(false));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  // Konfirmasi hapus
  $$('form[data-confirm]').forEach(f => f.addEventListener('submit', e => { if (!confirm(f.dataset.confirm)) e.preventDefault(); }));
  // Pratinjau gambar sebelum upload
  $$('input[type=file][data-preview]').forEach(inp => inp.addEventListener('change', () => {
    const box = document.getElementById(inp.dataset.preview), file = inp.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran gambar maksimal 5 MB.'); inp.value = ''; return; }
    box.innerHTML = ''; const img = new Image(); img.src = URL.createObjectURL(file); img.className = 'w-full h-full object-cover'; box.appendChild(img);
  }));
  // Pencarian tabel
  const q = $('#tableSearch');
  if (q) q.addEventListener('input', () => { const v = q.value.toLowerCase(); $$('[data-row]').forEach(r => r.classList.toggle('hidden', !r.textContent.toLowerCase().includes(v))); });
  // Hilangkan notifikasi otomatis
  $$('[data-flash]').forEach(f => setTimeout(() => f.remove(), 5000));
  // Pratinjau ikon Bootstrap
  const icon = $('input[data-icon-input]'), prev = $('#iconPreview');
  if (icon && prev) { const upd = () => prev.className = 'bi ' + (icon.value.trim() || 'bi-question') + ' text-2xl'; icon.addEventListener('input', upd); upd(); }
})();
