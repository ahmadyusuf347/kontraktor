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
    const vid = file.type.startsWith('video/'), max = (vid ? 50 : 5) * 1024 * 1024;
    if (file.size > max) { alert(vid ? 'Ukuran video maksimal 50 MB.' : 'Ukuran gambar maksimal 5 MB.'); inp.value = ''; return; }
    box.innerHTML = ''; const url = URL.createObjectURL(file);
    const el = vid ? Object.assign(document.createElement('video'), { src: url, muted: true, loop: true, autoplay: true, playsInline: true }) : Object.assign(new Image(), { src: url });
    el.className = 'w-full h-full object-cover'; box.appendChild(el);
  }));
  // Pencarian tabel
  const q = $('#tableSearch');
  if (q) q.addEventListener('input', () => { const v = q.value.toLowerCase(); $$('[data-row]').forEach(r => r.classList.toggle('hidden', !r.textContent.toLowerCase().includes(v))); });
  // Hilangkan notifikasi otomatis
  $$('[data-flash]').forEach(f => setTimeout(() => f.remove(), 5000));
  // Pratinjau ikon Bootstrap
  const icon = $('input[data-icon-input]'), prev = $('#iconPreview');
  if (icon && prev) { const upd = () => prev.className = 'bi ' + (icon.value.trim() || 'bi-question') + ' text-2xl'; icon.addEventListener('input', upd); upd(); }

  // Unggah langsung ke Supabase Storage (browser -> Supabase), lalu kirim hanya URL-nya bersama form.
  // (Server Vercel membatasi body request ±4,5 MB, jadi file tidak dikirim lewat server.)
  const meta = n => { const m = document.querySelector(`meta[name="${n}"]`); return m ? m.content : ''; };
  $$('form[data-direct-upload]').forEach(form => form.addEventListener('submit', async e => {
    const inputs = $$('input[type=file][data-field]', form).filter(i => i.files[0]);
    if (!inputs.length) return;
    e.preventDefault();
    const btn = $('button.btn', form), label = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Mengunggah…';
    try {
      if (!window.supabase || !meta('sb-url') || !meta('sb-key')) throw new Error('Supabase belum dikonfigurasi (SUPABASE_URL / SUPABASE_ANON_KEY).');
      const sb = window.supabase.createClient(meta('sb-url'), meta('sb-key'), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const csrf = $('input[name=_csrf]', form).value;
      for (const inp of inputs) {
        const file = inp.files[0];
        const r = await fetch('/admin/upload/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _csrf: csrf, field: inp.dataset.field, type: file.type, size: file.size }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Gagal menyiapkan unggahan (' + r.status + ')');
        const { error } = await sb.storage.from(j.bucket).uploadToSignedUrl(j.path, j.token, file, { contentType: file.type });
        if (error) throw new Error(error.message);
        form.querySelector(`input[name="${inp.dataset.field}__url"]`).value = j.publicUrl;
      }
      form.submit();
    } catch (err) {
      alert('Unggah gagal: ' + err.message);
      btn.disabled = false; btn.innerHTML = label;
    }
  }));
})();
