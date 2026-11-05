// Penyimpanan sederhana berbasis file JSON (data/db.json) – tanpa dependensi native.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const FILE = path.join(__dirname, '..', 'data', 'db.json');
let data;
const save = () => { const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, FILE); };
const load = () => {
  if (!fs.existsSync(FILE)) { data = require('./seed')(); save(); }
  else data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
};
load();
const newId = () => crypto.randomBytes(5).toString('hex');
module.exports = {
  list: name => (data[name] || []).slice(),
  get: (name, id) => (data[name] || []).find(i => i.id === id),
  add(name, item) { item.id = newId(); (data[name] ||= []).push(item); save(); return item; },
  update(name, id, patch) { const i = (data[name] || []).find(x => x.id === id); if (!i) return null; Object.assign(i, patch); save(); return i; },
  remove(name, id) { const n = (data[name] || []).length; data[name] = (data[name] || []).filter(i => i.id !== id); save(); return data[name].length < n; },
  obj: key => data[key] || {},
  setObj(key, val) { data[key] = val; save(); },
  save
};
