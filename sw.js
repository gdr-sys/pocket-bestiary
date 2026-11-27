/* Pocket Bestiary — copia locale per l'uso senza internet. Cambia VERSIONE a ogni rilascio. */
const VERSIONE = 'pb-8';
const FILE = ['./', 'index.html', 'css/caratteri.css', 'css/app.css', 'css/schede.css',
  'js/testi.js', 'js/gs.js', 'js/dati.js', 'js/immagini.js', 'js/account.js', 'js/schede.js', 'js/editor.js', 'js/mazzo.js', 'js/app.js',
  'data/mostri-2014.json', 'data/mostri-2024.json', 'icons/favicon.svg', 'img/scene/bestiario.webp', 'img/scene/crea.webp', 'img/scene/mazzo.webp', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSIONE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
// Prima la rete (così gli aggiornamenti arrivano subito), la copia locale solo senza connessione
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(VERSIONE).then(c => c.put(e.request, copia)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
