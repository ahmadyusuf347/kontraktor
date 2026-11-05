// Menyalin aset front-end dari node_modules ke public/vendor (tanpa CDN)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'public', 'vendor');
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
cp(path.join(root, 'node_modules/gsap/dist/gsap.min.js'), path.join(out, 'gsap.min.js'));
cp(path.join(root, 'node_modules/gsap/dist/ScrollTrigger.min.js'), path.join(out, 'ScrollTrigger.min.js'));
const bi = path.join(root, 'node_modules/bootstrap-icons/font');
cp(path.join(bi, 'bootstrap-icons.min.css'), path.join(out, 'bootstrap-icons/bootstrap-icons.css'));
for (const f of fs.readdirSync(path.join(bi, 'fonts'))) cp(path.join(bi, 'fonts', f), path.join(out, 'bootstrap-icons/fonts', f));
console.log('vendor assets copied');
