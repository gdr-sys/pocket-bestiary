/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   MAZZO.JS — Le carte da stampare, come in Compendio Arcano:
   fogli A4 con 9 carte poker (3×3) o 4 carte grandi (2×2), segni
   di taglio e, se serve, il retro. Il retro di ogni foglio ha le
   righe specchiate: stampando fronte-retro sul lato lungo ogni
   retro cade dietro la sua carta.
   ============================================================ */

const Mazzo = (() => {
  const { esc, gsEtichetta } = T;

  const voci = () => Dati.mazzo.map(v => {
    const base = Dati.trova(v.ref);
    return base ? { ...v, mostro: GS.applica(base, v.varianti) } : null;
  }).filter(Boolean);

  const opz = () => ({ formato: Dati.pref('formato'), coloreTipo: Dati.pref('coloreTipo'), immagine: (Dati.pref('posizione') || 'fronte') !== 'nessuna', posizione: Dati.pref('posizione') || 'fronte', altezza: Dati.pref('altezza') || 'media' });
  const conRetroIll = () => ['retro', 'entrambi'].includes(Dati.pref('posizione'));

  const ICONA_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICONA_SX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  const ICONA_DX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

  const disegna = () => {
    const lista = voci();
    const n = lista.length;
    document.getElementById('mazzo-vuoto').hidden = n > 0;
    document.querySelector('.mazzo-opzioni').hidden = n === 0;
    const tavolo = document.getElementById('tavolo');
    if (!n) { tavolo.innerHTML = ''; document.getElementById('riepilogo-mazzo').textContent = 'Le carte dei mostri da stampare e ritagliare.'; return; }
    let carteTot = 0;
    tavolo.innerHTML = lista.map((v, i) => {
      const carte = Schede.carte(v.mostro, opz());
      carteTot += carte.length;
      const m = v.mostro;
      return '<div class="posto">' + carte.join('') + (conRetroIll() ? Schede.retro(m, opz().formato, opz()) : '') +
        '<div class="posto-comandi">' +
          (i > 0 ? '<button type="button" class="icona-btn" data-sposta="-1" data-k="' + v.k + '" aria-label="Sposta prima">' + ICONA_SX + '</button>' : '') +
          '<span>' + esc(m.nome) + ' · GS ' + gsEtichetta(m.grado_sfida?.valore) + (carte.length > 1 ? ' · ' + carte.length + ' carte' : '') + '</span>' +
          (i < n - 1 ? '<button type="button" class="icona-btn" data-sposta="1" data-k="' + v.k + '" aria-label="Sposta dopo">' + ICONA_DX + '</button>' : '') +
          '<button type="button" class="icona-btn pericolo" data-togli="' + v.k + '" aria-label="Togli ' + esc(m.nome) + ' dal mazzo">' + ICONA_X + '</button>' +
        '</div></div>';
    }).join('');
    const f = Schede.FORMATI[Dati.pref('formato')];
    const fogli = Math.ceil(carteTot / (f.cols * f.rows));
    document.getElementById('riepilogo-mazzo').textContent = n + (n === 1 ? ' mostro, ' : ' mostri, ') + carteTot + (carteTot === 1 ? ' carta' : ' carte') + ' su ' + fogli + (fogli === 1 ? ' foglio A4' : ' fogli A4');
  };

  // ── Stampa ──
  const segniTaglio = (f, celle) => {
    const righe = Math.ceil(celle / f.cols), colonne = Math.min(f.cols, celle);
    const W = colonne * f.w, H = righe * f.h, L = 4;
    let h = '';
    for (let c = 0; c <= colonne; c++) { const x = c * f.w; h += '<i style="left:' + x + 'mm;top:-' + (L + 1) + 'mm;width:0;height:' + L + 'mm"></i><i style="left:' + x + 'mm;top:' + (H + 1) + 'mm;width:0;height:' + L + 'mm"></i>'; }
    for (let r = 0; r <= righe; r++) { const y = r * f.h; h += '<i style="top:' + y + 'mm;left:-' + (L + 1) + 'mm;height:0;width:' + L + 'mm"></i><i style="top:' + y + 'mm;left:' + (W + 1) + 'mm;height:0;width:' + L + 'mm"></i>'; }
    return '<div class="taglio">' + h + '</div>';
  };

  const stampa = () => {
    const lista = voci();
    if (!lista.length) return;
    const o = opz(), f = Schede.FORMATI[o.formato];
    const perFoglio = f.cols * f.rows;
    const fronti = [], retri = [];
    lista.forEach(v => { Schede.carte(v.mostro, o).forEach(h => { fronti.push(h); retri.push(Schede.retro(v.mostro, o.formato, o)); }); });
    const conRetro = Dati.pref('retro') || conRetroIll();
    const taglio = Dati.pref('taglio');
    let pagine = '';
    for (let i = 0; i < fronti.length; i += perFoglio) {
      const pezzo = fronti.slice(i, i + perFoglio);
      pagine += '<section class="foglio"><div class="griglia-foglio" style="grid-template-columns:repeat(' + f.cols + ',' + f.w + 'mm)">' + (taglio ? segniTaglio(f, pezzo.length) : '') + pezzo.join('') + '</div></section>';
      if (conRetro) {
        const r = retri.slice(i, i + perFoglio);
        // righe specchiate; le celle vuote tengono il posto
        let celle = '';
        for (let riga = 0; riga < Math.ceil(r.length / f.cols); riga++) {
          const fila = [];
          for (let c = 0; c < f.cols; c++) fila.push(r[riga * f.cols + c] || '<div style="width:' + f.w + 'mm;height:' + f.h + 'mm"></div>');
          celle += fila.reverse().join('');
        }
        pagine += '<section class="foglio"><div class="griglia-foglio" style="grid-template-columns:repeat(' + f.cols + ',' + f.w + 'mm)">' + celle + '</div></section>';
      }
    }
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    const simbolo = document.querySelector('svg[aria-hidden="true"] defs').outerHTML;
    const w = window.open('', '_blank');
    if (!w) { Pocket.avviso('Il browser ha bloccato la finestra di stampa. Consenti i popup per questo sito e riprova.'); return; }
    w.document.write('<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Pocket Bestiary · carte</title><base href="' + base + '">' +
      '<link rel="stylesheet" href="css/caratteri.css"><link rel="stylesheet" href="css/schede.css">' +
      '<style>@page{size:A4 portrait;margin:0}body{margin:0;background:#e9e4da}.foglio{width:210mm;height:297mm;display:grid;place-items:center;break-after:page;page-break-after:always;background:#fff;margin:0 auto 8mm}.foglio:last-child{break-after:auto}' +
      '.griglia-foglio{position:relative;display:grid;gap:0}.carta{box-shadow:inset 0 0 0 1.6mm var(--cornice)!important;border-radius:0}.carta.retro{box-shadow:none!important}' +
      '.taglio{position:absolute;inset:0;pointer-events:none}.taglio i{position:absolute;border-left:.2mm solid #000;border-top:.2mm solid #000}' +
      '.barra-st{position:sticky;top:0;display:flex;gap:12px;align-items:center;justify-content:center;padding:10px;background:#1a1612;color:#f6efe8;font:600 14px/1.3 Figtree,sans-serif}.barra-st button{font:inherit;padding:8px 18px;border-radius:999px;border:0;background:#8fb86f;color:#1a1612;cursor:pointer}' +
      '@media print{body{background:#fff}.foglio{margin:0}.barra-st{display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>' +
      '<div class="barra-st">' + fronti.length + ' carte · ' + f.nome + ' ' + f.misura + ' mm su A4' + (conRetro ? ' · fronte-retro sul lato lungo' : '') + ' · stampa al 100%, senza adattare alla pagina <button onclick="print()">Stampa</button></div>' +
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + simbolo + '</svg>' + pagine + '</body></html>');
    w.document.close();
    w.focus();
    const via = () => setTimeout(() => { try { w.print(); } catch (e) {} }, 300);
    if (w.document.fonts && w.document.fonts.ready) w.document.fonts.ready.then(via); else via();
  };

  const collega = () => {
    document.getElementById('tavolo').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.togli) { Dati.togliMazzo(b.dataset.togli); disegna(); Pocket.aggiornaConta(); }
      else if (b.dataset.sposta) { Dati.spostaMazzo(b.dataset.k, +b.dataset.sposta); disegna(); }
    });
    const fm = document.getElementById('formati');
    fm.innerHTML = Object.entries(Schede.FORMATI).map(([id, f]) => '<button type="button" data-formato="' + id + '" aria-pressed="' + (Dati.pref('formato') === id) + '">' + f.nome + ' <small>' + f.misura + '</small></button>').join('');
    fm.addEventListener('click', (e) => { const b = e.target.closest('[data-formato]'); if (!b) return; Dati.pref('formato', b.dataset.formato); fm.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); disegna(); });
    [['opz-taglio', 'taglio'], ['opz-retro', 'retro'], ['opz-colore', 'coloreTipo']].forEach(([id, k]) => {
      const el = document.getElementById(id); el.checked = !!Dati.pref(k);
      el.addEventListener('change', () => { Dati.pref(k, el.checked); if (k === 'coloreTipo') disegna(); });
    });
    const mp = document.getElementById('mazzo-posizione');
    const POS = [['fronte', 'Fronte'], ['retro', 'Retro'], ['entrambi', 'Fronte e retro'], ['nessuna', 'Nessuna']];
    const disegnaPos = () => { mp.innerHTML = POS.map(([v, t]) => '<button type="button" data-pos="' + v + '" aria-pressed="' + ((Dati.pref('posizione') || 'fronte') === v) + '">' + t + '</button>').join(''); };
    const ma = document.getElementById('mazzo-altezza');
    const disegnaAlt = () => {
      ma.innerHTML = [['bassa', 'Bassa'], ['media', 'Media'], ['alta', 'Alta']].map(([v, t]) => '<button type="button" data-alt="' + v + '" aria-pressed="' + ((Dati.pref('altezza') || 'media') === v) + '">' + t + '</button>').join('');
      document.getElementById('mazzo-altezza-g').hidden = ['retro', 'nessuna'].includes(Dati.pref('posizione'));
    };
    disegnaPos(); disegnaAlt();
    mp.addEventListener('click', (e) => { const b = e.target.closest('[data-pos]'); if (!b) return; Dati.pref('posizione', b.dataset.pos); disegnaPos(); disegnaAlt(); disegna(); });
    ma.addEventListener('click', (e) => { const b = e.target.closest('[data-alt]'); if (!b) return; Dati.pref('altezza', b.dataset.alt); disegnaAlt(); disegna(); });
    document.getElementById('stampa-mazzo').addEventListener('click', stampa);
    const sv = document.getElementById('svuota-mazzo');
    sv.addEventListener('click', () => {
      if (sv.dataset.conferma) { Dati.svuotaMazzo(); disegna(); Pocket.aggiornaConta(); delete sv.dataset.conferma; sv.textContent = 'Svuota'; return; }
      sv.dataset.conferma = '1'; sv.textContent = 'Tocca ancora per svuotare';
      setTimeout(() => { delete sv.dataset.conferma; sv.textContent = 'Svuota'; }, 3500);
    });
  };

  return { disegna, collega, stampa };
})();
