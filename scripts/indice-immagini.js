// Rigenera img/mostri/indice.json con le illustrazioni presenti nella cartella.
// Uso: node scripts/indice-immagini.js  (da lanciare dopo aver aggiunto o tolto immagini)
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'img', 'mostri');
const lista = fs.readdirSync(dir).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort();
fs.writeFileSync(path.join(dir, 'indice.json'), JSON.stringify({ v: Date.now().toString(36), l: lista }));
console.log(lista.length + ' illustrazioni nell\'indice');
