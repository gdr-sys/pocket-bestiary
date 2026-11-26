/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   IMMAGINI.JS — L'illustrazione di ogni mostro, in quest'ordine:
     1. l'immagine caricata dall'utente (IndexedDB, per mostro)
     2. l'illustrazione dell'app per quel mostro (img/mostri/<id>.webp)
        o per la sua famiglia (drago_rosso_adulto → drago_rosso)
     3. l'illustrazione del suo tipo (img/mostri/tipo-<tipo>.webp)
   Le illustrazioni dell'app sono originali, in bianco e nero,
   elencate in img/mostri/indice.json.
   ============================================================ */

const Immagini = (() => {
  let indice = new Set();
  const proprie = new Map();   // ref → objectURL
  const DB = 'pb_immagini', STORE = 'img';

  const apriDB = () => new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
  const tx = async (modo, fn) => {
    const db = await apriDB();
    return new Promise((ok, ko) => { const t = db.transaction(STORE, modo); const res = fn(t.objectStore(STORE)); t.oncomplete = () => ok(res && res.result); t.onerror = () => ko(t.error); });
  };

  const carica = async () => {
    try { indice = new Set(await fetch('img/mostri/indice.json').then(r => r.json())); } catch (e) { indice = new Set(); }
    // Le immagini proprie non devono mai bloccare l'avvio: al massimo 2 secondi
    const attesa = new Promise(ok => setTimeout(ok, 2000));
    try {
      await Promise.race([attesa, (async () => {
      const db = await apriDB();
      await new Promise((ok) => {
        const t = db.transaction(STORE, 'readonly'), st = t.objectStore(STORE);
        const c = st.openCursor();
        c.onsuccess = () => { const cur = c.result; if (cur) { proprie.set(cur.key, URL.createObjectURL(cur.value)); cur.continue(); } else ok(); };
        c.onerror = () => ok();
      });
      })()]);
    } catch (e) { /* IndexedDB non disponibile: solo le illustrazioni dell'app */ }
  };

  const slugTipo = (t) => T.normal(t).replace(/\s+/g, '-');
  const TIPO_FILE = { Non: 'non-morto', Sciame: 'bestia', Mostruosita: 'mostruosita' };
  const famiglia = (id) => String(id).replace(/_(cucciolo|giovane|adulto|antico)$/, '');

  // Restituisce { src, propria, generica }
  const per = (m) => {
    if (!m) return null;
    const ref = m._ref;
    if (ref && proprie.has(ref)) return { src: proprie.get(ref), propria: true };
    if (m.immagine) return { src: m.immagine, propria: true };
    const o = m.origine || m._origine; const ids = [m.id, famiglia(m.id), o, o && famiglia(o)].filter(Boolean);
    for (const id of ids) if (indice.has(id)) return { src: 'img/mostri/' + id + '.webp' };
    const tb = Dati.tipoBase(m.tipo);
    const nomeTipo = TIPO_FILE[T.normal(tb).replace(/^./, c => c.toUpperCase())] || TIPO_FILE[tb] || slugTipo(tb);
    if (indice.has('tipo-' + nomeTipo)) return { src: 'img/mostri/tipo-' + nomeTipo + '.webp', generica: true };
    return null;
  };

  // Riduce un file a webp 768px, scala di grigi facoltativa no: l'utente può volere il colore
  const riduci = (file, lato = 768) => new Promise((ok, ko) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, lato / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : ko(new Error('conversione')), 'image/webp', .85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('immagine non leggibile')); };
    img.src = url;
  });

  const imposta = async (ref, file) => {
    const blob = await riduci(file);
    await tx('readwrite', st => st.put(blob, ref));
    if (proprie.has(ref)) URL.revokeObjectURL(proprie.get(ref));
    proprie.set(ref, URL.createObjectURL(blob));
    return blob;
  };
  const togli = async (ref) => {
    await tx('readwrite', st => st.delete(ref));
    if (proprie.has(ref)) URL.revokeObjectURL(proprie.get(ref));
    proprie.delete(ref);
  };
  const haPropria = (ref) => proprie.has(ref);
  // Per l'esportazione dei mostri homebrew: l'immagine come data URL
  const comeDataURL = async (ref) => {
    const b = await tx('readonly', st => st.get(ref));
    if (!b) return null;
    return new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
  };
  const daDataURL = async (ref, dataURL) => { const b = await fetch(dataURL).then(r => r.blob()); await tx('readwrite', st => st.put(b, ref)); proprie.set(ref, URL.createObjectURL(b)); };

  return { carica, per, imposta, togli, haPropria, comeDataURL, daDataURL };
})();
