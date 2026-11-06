const crypto = require('crypto');
// Token dibuat saat dibutuhkan saja (halaman publik biasa tidak memasang cookie apa pun)
const ensure = req => (req.session.csrf ||= crypto.randomBytes(24).toString('hex'));
const verify = (req, token) => {
  const t = String(token || ''), s = req.session && req.session.csrf;
  return !!s && t.length === s.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(s));
};
module.exports = { ensure, verify };
