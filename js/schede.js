/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   SCHEDE.JS — Come si disegna una scheda. Quattro stili:
     manuale    pergamena e filetti rossi, impaginata come il
                manuale della sua edizione (2014 o 2024)
     pocket     le tessere di Pocket GM Screen, segue la tavolozza
     inchiostro bianco e nero, compatta, per stampare senza colore
     carta      carta da gioco 63×88 mm (o 95×133), come le carte
                di Compendio Arcano; il testo lungo si rimpicciolisce
                e, se non basta, continua su altre carte
   ============================================================ */

const Schede = (() => {
  const { esc, inline, CAR, nomeAbilita, VELOCITA, SENSI, segno, num, gsEtichetta, maiuscola } = T;

  const STILI = [
    { id: 'manuale', nome: 'Manuale' },
    { id: 'pocket', nome: 'Pocket' },
    { id: 'inchiostro', nome: 'Inchiostro' },
    { id: 'carta', nome: 'Carta' },
  ];

  // Colore della cornice delle carte per tipo di creatura (tinta OKLCH)
  const TINTE = { Aberrazione: 305, Bestia: 110, Celestiale: 85, Costrutto: 235, Drago: 28, Elementale: 200, Folletto: 340, Gigante: 55, Immondo: 12, Melma: 145, Mostruosità: 45, Non: 280, Umanoide: 65, Vegetale: 130, Sciame: 75 };
  const tinta = (m) => TINTE[m._tipo] ?? TINTE[Dati.tipoBase(m.tipo)] ?? 60;

  // ── Righe di testo comuni ──
  const sottotitolo = (m) => {
    const tipo = m.tipo || '';
    const dim = [m.dimensione, m.sottodimensione].filter(Boolean).join(' ');
    return [tipo + (dim ? ' ' + dim : '') + (m.sottotipo ? ' ' + m.sottotipo : ''), m.allineamento].filter(Boolean).join(', ');
  };
  const velocita = (m) => {
    const v = m.velocita || {};
    const out = [];
    if (v.camminata) out.push(v.camminata);
    Object.keys(v).forEach(k => { if (k !== 'camminata' && v[k]) out.push((VELOCITA[k] || k) + ' ' + v[k]); });
    return out.join(', ') || '—';
  };
  const pf = (m) => { const p = m.punti_ferita || {}; return (p.media ?? '—') + (p.formula ? ' (' + p.formula + ')' : ''); };
  const ca = (m) => String(m.classe_armatura ?? '—') + (m.armatura ? ' (' + m.armatura + ')' : '');
  const iniziativa = (m) => {
    const des = m.caratteristiche?.destrezza?.modificatore ?? 0;
    const b = m.iniziativa?.bonus ?? des;
    const v = m.iniziativa?.valore ?? 10 + b;
    return segno(b) + ' (' + v + ')';
  };
  const salvezze = (m) => CAR.filter(([k]) => { const c = m.caratteristiche?.[k]; return c && c.tiro_salvezza !== c.modificatore; })
    .map(([k, s]) => maiuscola(s.toLowerCase()) + ' ' + segno(m.caratteristiche[k].tiro_salvezza)).join(', ');
  const abilita = (m) => Object.entries(m.abilita || {}).map(([k, v]) => nomeAbilita(k) + ' ' + segno(v)).join(', ');
  const lista = (x) => (Array.isArray(x) ? x : x ? [x] : []).join(', ');
  const sensi = (m) => {
    const s = m.sensi || {};
    const out = [];
    Object.keys(s).forEach(k => {
      if (k.startsWith('percezione_passiva')) return;
      const v = s[k];
      const etichetta = SENSI[k] || k.replace(/_/g, ' ');
      out.push(typeof v === 'string' ? etichetta.replace(/ \d+ m.*$/, '') + ' ' + v : etichetta);
    });
    if (s.percezione_passiva != null) out.push('Percezione passiva ' + s.percezione_passiva);
    return out.join(', ');
  };
  const sfida = (m, ed) => {
    const g = m.grado_sfida || {};
    const v = Number(g.valore ?? 0);
    const peV = g.punti_esperienza ?? GS.pe(v);
    const bc = m.bonus_competenza ?? GS.competenza(v);
    if (ed === '2014') return gsEtichetta(v) + ' (' + num(peV) + ' PE)';
    return gsEtichetta(v) + ' (PE ' + num(peV) + (g.punti_esperienza_tana ? ', o ' + num(g.punti_esperienza_tana) + ' nella tana' : '') + '; BC ' + segno(bc) + ')';
  };

  // Illustrazione: opz.illustrazioni === false la nasconde
  // Inquadratura dell'illustrazione sulla carta, per mostro: { y: 0-100 (%), z: 1-2.5 }
  const inquadratura = (m) => { try { return (JSON.parse(localStorage.getItem('pb_inq') || '{}'))[m._ref] || {}; } catch (e) { return {}; } };
  const ALTEZZE = { bassa: .18, media: .26, alta: .36 };
  const figuraCarta = (m, opz) => {
    if (typeof Immagini === 'undefined') return ''; const i = Immagini.per(m); if (!i) return '';
    const q = inquadratura(m), y = q.y ?? 50, z = q.z ?? 1;
    return '<figure class="c-fig' + (i.generica ? ' generica' : '') + (i.propria ? ' propria' : '') + '" style="height:calc(var(--h) * ' + (ALTEZZE[opz.altezza] || ALTEZZE.media) + ')"><img src="' + esc(i.src) + '" alt="" decoding="async" style="object-position:50% ' + y + '%;transform:scale(' + z + ');transform-origin:50% ' + y + '%"></figure>';
  };
  const figura = (m, opz, cls) => { if (opz.illustrazioni === false || typeof Immagini === 'undefined') return ''; const i = Immagini.per(m); if (!i) return ''; return '<figure class="' + cls + (i.generica ? ' generica' : '') + (i.propria ? ' propria' : '') + '" data-ingrandisci="' + esc(i.src) + '" data-nome="' + esc(m.nome) + '" tabindex="0" role="button" aria-label="Vedi in grande: ' + esc(m.nome) + '"><img src="' + esc(i.src) + '" alt="' + (i.generica ? '' : 'Illustrazione: ' + esc(m.nome)) + '" loading="lazy" decoding="async"></figure>'; };

  const SEZIONI = [
    ['tratti', 'Tratti'], ['azioni', 'Azioni'], ['azioni_bonus', 'Azioni bonus'], ['reazioni', 'Reazioni'],
  ];
  const voce = (x, opz) => '<p class="sv"><span class="sv-n">' + esc(x.nome).replace(/\.$/, '') + '.</span> ' + inline(x.descrizione, opz) + '</p>';

  // Proprietà sotto le caratteristiche: [etichetta, valore]
  const proprieta = (m, ed) => {
    const r = [];
    const ts = salvezze(m), ab = abilita(m);
    if (ed === '2014') {
      if (ts) r.push(['Tiri salvezza', ts]);
      if (ab) r.push(['Abilità', ab]);
      if (m.vulnerabilita?.length) r.push(['Vulnerabilità ai danni', lista(m.vulnerabilita)]);
      if (m.resistenze?.length) r.push(['Resistenze ai danni', lista(m.resistenze)]);
      if (m.immunita_danni?.length) r.push(['Immunità ai danni', lista(m.immunita_danni)]);
      if (m.immunita_condizione?.length) r.push(['Immunità alle condizioni', lista(m.immunita_condizione)]);
      r.push(['Sensi', sensi(m) || '—']);
      r.push(['Linguaggi', lista(m.lingue) || '—']);
      r.push(['Sfida', sfida(m, ed)]);
    } else {
      if (ab) r.push(['Abilità', ab]);
      if (m.vulnerabilita?.length) r.push(['Vulnerabilità', lista(m.vulnerabilita)]);
      if (m.resistenze?.length) r.push(['Resistenze', lista(m.resistenze)]);
      const imm = [lista(m.immunita_danni), lista(m.immunita_condizione)].filter(Boolean).join('; ');
      if (imm) r.push(['Immunità', imm]);
      if (m.equipaggiamento?.length) r.push(['Equipaggiamento', lista(m.equipaggiamento)]);
      r.push(['Sensi', sensi(m) || '—']);
      r.push(['Lingue', lista(m.lingue) || 'nessuna']);
      r.push(['GS', sfida(m, ed)]);
    }
    return r;
  };

  const caratteristiche2014 = (m) => '<div class="car14">' + CAR.map(([k, s]) => {
    const c = m.caratteristiche?.[k] || { punteggio: 10, modificatore: 0 };
    return '<div><b>' + s + '</b><span>' + c.punteggio + ' (' + segno(c.modificatore) + ')</span></div>';
  }).join('') + '</div>';

  const caratteristiche2024 = (m) => {
    const cella = ([k, s], i) => {
      const c = m.caratteristiche?.[k] || { punteggio: 10, modificatore: 0, tiro_salvezza: 0 };
      return '<div class="c24 ' + (i < 3 ? 'fis' : 'men') + '"><b>' + s + '</b><span class="p">' + c.punteggio + '</span><span>' + segno(c.modificatore) + '</span><span>' + segno(c.tiro_salvezza ?? c.modificatore) + '</span></div>';
    };
    const testa = '<div class="c24 testa"><b></b><span class="p"></span><span>MOD</span><span>TS</span></div>';
    return '<div class="car24">' + [0, 1, 2].map(i => '<div class="col24">' + testa + cella(CAR[i], i) + cella(CAR[i + 3], i + 3) + '</div>').join('') + '</div>';
  };

  const sezioniTesto = (m, ed, opz) => {
    let h = '';
    SEZIONI.forEach(([k, titolo]) => {
      const voci = m[k] || [];
      if (!voci.length) return;
      const conTitolo = !(ed === '2014' && k === 'tratti');
      h += '<section class="ss">' + (conTitolo ? '<h3 class="ss-t">' + titolo + '</h3>' : '') + voci.map(x => voce(x, opz)).join('') + '</section>';
    });
    const L = m.azioni_leggendarie;
    if (L && (L.azioni?.length || L.descrizione_utilizzi)) {
      let intro = L.descrizione_utilizzi || '';
      if (ed !== '2014' && L.utilizzi && !/^\d+$/.test(String(L.utilizzi).trim())) intro = '<em>' + esc(L.utilizzi) + '.</em> ' + inline(intro, opz);
      else intro = inline(intro, opz);
      h += '<section class="ss"><h3 class="ss-t">Azioni leggendarie</h3><p class="sv intro">' + intro + '</p>' + (L.azioni || []).map(x => voce(x, opz)).join('') + '</section>';
    }
    return h;
  };

  // ── Manuale e Inchiostro: stessa struttura, due vesti ──
  const manuale = (m, opz = {}) => {
    const ed = m._formato || '2024';
    const stile = opz.stile || 'manuale';
    const filetto = '<div class="filetto" aria-hidden="true"></div>';
    const base = ed === '2014'
      ? '<p class="pr"><b>Classe Armatura</b> ' + esc(ca(m)) + '</p><p class="pr"><b>Punti ferita</b> ' + inline(pf(m), opz) + '</p><p class="pr"><b>Velocità</b> ' + esc(velocita(m)) + '</p>'
      : '<p class="pr"><b>CA</b> ' + esc(ca(m)) + '<span class="sep"></span><b>Iniziativa</b> ' + esc(iniziativa(m)) + '</p><p class="pr"><b>PF</b> ' + inline(pf(m), opz) + '</p><p class="pr"><b>Velocità</b> ' + esc(velocita(m)) + '</p>';
    const props = proprieta(m, ed).map(([e, v]) => '<p class="pr"><b>' + e + '</b> ' + esc(v) + '</p>').join('');
    return '<article class="scheda s-' + stile + ' f-' + ed + (opz.colonne ? ' due-col' : '') + '" lang="it">' +
      figura(m, opz, 'sm-fig') + '<header class="sh"><h2 class="sn">' + esc(m.nome) + '</h2><p class="st">' + esc(sottotitolo(m)) + '</p></header>' +
      filetto + '<div class="sb">' + base + '</div>' + filetto +
      (ed === '2014' ? caratteristiche2014(m) : caratteristiche2024(m)) +
      filetto + '<div class="sp">' + props + '</div>' + filetto +
      '<div class="sx">' + sezioniTesto(m, ed, opz) + '</div>' +
      piede(m) + '</article>';
  };

  const piede = (m) => '<footer class="sf">' + (m._ed === 'homebrew' ? 'Homebrew' : 'SRD ' + (m._ed === '2014' ? '5.1' : '5.2.1')) + (m._variante ? ' · variante da GS ' + gsEtichetta(m._variante.daGS) : '') + '</footer>';

  // ── Pocket: tessere dell'app ──
  const pocket = (m, opz = {}) => {
    const ed = m._formato || '2024';
    const g = Number(m.grado_sfida?.valore ?? 0);
    const numero = (e, v, sotto) => '<div class="pk-n"><span class="pk-e">' + e + '</span><span class="pk-v">' + v + '</span>' + (sotto ? '<span class="pk-s">' + sotto + '</span>' : '') + '</div>';
    const p = m.punti_ferita || {};
    const des = m.caratteristiche?.destrezza?.modificatore ?? 0;
    const inBonus = m.iniziativa?.bonus ?? des;
    const props = proprieta(m, ed).filter(([e]) => e !== 'GS' && e !== 'Sfida');
    return '<article class="scheda s-pocket f-' + ed + '" lang="it">' +
      '<header class="pk-testa">' + figura(m, opz, 'pk-fig') + '<div class="pk-nome"><p class="pk-tipo">' + esc(sottotitolo(m)) + '</p><h2 class="sn">' + esc(m.nome) + '</h2></div>' +
      '<div class="pk-gs"><span>GS</span><b>' + gsEtichetta(g) + '</b><small>' + num(m.grado_sfida?.punti_esperienza ?? GS.pe(g)) + ' PE</small></div></header>' +
      '<div class="pk-numeri">' + numero('CA', esc(m.classe_armatura ?? '—'), m.armatura ? esc(m.armatura) : '') + numero('PF', esc(p.media ?? '—'), p.formula ? inline(p.formula, opz) : '') + numero('Iniziativa', segno(inBonus), '') + numero('Velocità', esc((m.velocita?.camminata || '—')), esc(velocita(m).split(', ').slice(1).join(', '))) + '</div>' +
      '<div class="pk-car">' + CAR.map(([k, s]) => { const c = m.caratteristiche?.[k] || { punteggio: 10, modificatore: 0 }; const ts = c.tiro_salvezza !== c.modificatore; return '<div class="' + (ts ? 'ts' : '') + '"><span>' + s + '</span><b>' + segno(c.modificatore) + '</b><small>' + c.punteggio + (ts ? ' · TS ' + segno(c.tiro_salvezza) : '') + '</small></div>'; }).join('') + '</div>' +
      '<dl class="pk-props">' + props.map(([e, v]) => '<div><dt>' + e + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>' +
      '<div class="sx">' + sezioniTesto(m, ed, opz) + '</div>' + piede(m) + '</article>';
  };

  // ── Carta da gioco ──
  // Formati di stampa (mm) e quante carte stanno su un A4 verticale; fs = corpo del testo
  const FORMATI = {
    mini:     { nome: 'Mini', misura: '44×63', w: 44, h: 63, cols: 4, rows: 4, fs: 5.4 },
    poker:    { nome: 'Poker', misura: '63×88', w: 63, h: 88, cols: 3, rows: 3, fs: 6.9 },
    tarocchi: { nome: 'Tarocchi', misura: '70×120', w: 70, h: 120, cols: 2, rows: 2, fs: 7.4 },
    grande:   { nome: 'Grande', misura: '95×133', w: 95, h: 133, cols: 2, rows: 2, fs: 8.4 },
    a5:       { nome: 'Scheda A5', misura: '148×210', w: 148, h: 210, cols: 1, rows: 1, fs: 10.5 },
  };

  const testaCarta = (m, cont, tot, idx) => {
    const g = Number(m.grado_sfida?.valore ?? 0);
    return '<header class="ct"><div class="ct-n"><h2>' + esc(m.nome) + '</h2><p>' + (idx > 0 ? 'continua · ' + (idx + 1) + ' di ' + tot : esc(sottotitolo(m))) + '</p></div><div class="ct-gs"><small>GS</small><b>' + gsEtichetta(g) + '</b></div></header>';
  };
  const corpoStatCarta = (m) => {
    const ed = m._formato || '2024';
    const p = m.punti_ferita || {};
    const strip = '<div class="cs"><div><small>CA</small><b>' + esc(m.classe_armatura ?? '—') + '</b></div><div><small>PF</small><b>' + esc(p.media ?? '—') + '</b>' + (p.formula ? '<i>' + esc(p.formula) + '</i>' : '') + '</div><div class="cs-v"><small>Velocità</small><b>' + esc(velocita(m)) + '</b></div>' + (ed === '2024' ? '<div><small>Iniz.</small><b>' + esc(iniziativa(m).split(' ')[0]) + '</b></div>' : '') + '</div>';
    const car = '<div class="cc">' + CAR.map(([k, s]) => { const c = m.caratteristiche?.[k] || { punteggio: 10, modificatore: 0 }; const ts = c.tiro_salvezza !== c.modificatore; return '<div' + (ts ? ' class="ts"' : '') + '><small>' + s + '</small><b>' + segno(c.modificatore) + '</b><i>' + c.punteggio + (ts ? ' · ' + segno(c.tiro_salvezza) : '') + '</i></div>'; }).join('') + '</div>';
    const props = proprieta(m, ed).filter(([e]) => e !== 'GS' && e !== 'Sfida' && !(e === 'Tiri salvezza')).map(([e, v]) => '<p><b>' + e + '</b> ' + esc(v) + '</p>').join('');
    return strip + car + '<div class="cp">' + props + '</div>';
  };
  // Blocchi del testo, uno per voce, per poterli dividere tra più carte
  // Ogni blocco: { titolo, nome, testo, pre } — "pre" è HTML già pronto davanti al testo
  const blocchiCarta = (m) => {
    const ed = m._formato || '2024';
    const out = [];
    SEZIONI.forEach(([k, titolo]) => {
      (m[k] || []).forEach((x, i) => out.push({ titolo: i === 0 && !(ed === '2014' && k === 'tratti') ? titolo : '', nome: x.nome, testo: x.descrizione || '' }));
    });
    const L = m.azioni_leggendarie;
    if (L && (L.azioni?.length)) {
      out.push({ titolo: 'Azioni leggendarie', nome: '', testo: L.descrizione_utilizzi || '', pre: L.utilizzi && !/^\d+$/.test(String(L.utilizzi).trim()) ? '<em>' + esc(L.utilizzi) + '.</em> ' : '' });
      L.azioni.forEach(x => out.push({ titolo: '', nome: x.nome, testo: x.descrizione || '' }));
    }
    return out;
  };
  const bloccoHTML = (b) => (b.titolo ? '<h3>' + b.titolo + '</h3>' : '') +
    (b.nome ? voce({ nome: b.nome, descrizione: b.testo }, {}) : '<p class="sv' + (b.cont ? ' cont' : ' intro') + '">' + (b.pre || '') + inline(b.testo) + '</p>');
  // Divide il testo di un blocco dopo la frase n-esima
  const frasi = (t) => String(t).split(/(?<=[.;])\s+(?=[A-ZÀ-Ý*(«"0-9])/);
  const taglia = (b, n) => {
    const f = frasi(b.testo);
    return [{ ...b, testo: f.slice(0, n).join(' ') }, { titolo: '', nome: '', testo: f.slice(n).join(' '), cont: true }];
  };
  const pieCarta = (m, idx, tot) => '<footer class="cf"><span>' + (m._ed === 'homebrew' ? 'Homebrew' : 'SRD ' + (m._ed === '2014' ? '5.1 · 2014' : '5.2.1 · 2024')) + '</span><span>' + num(m.grado_sfida?.punti_esperienza ?? GS.pe(Number(m.grado_sfida?.valore ?? 0))) + ' PE' + (tot > 1 ? ' · ' + (idx + 1) + '/' + tot : '') + '</span></footer>';

  const cartaHTML = (m, formato, pezzo, idx, tot, scala, opz) => {
    const f = FORMATI[formato] || FORMATI.poker;
    const stile = '--w:' + f.w + 'mm;--h:' + f.h + 'mm;--fs:' + f.fs + 'pt;--sc:' + scala + ';--tinta:' + tinta(m) + ';';
    return '<article class="carta f-' + formato + (opz.coloreTipo === false ? ' neutra' : '') + '" style="' + stile + '" lang="it">' +
      testaCarta(m, idx > 0, tot, idx) + (idx === 0 && opz.immagine !== false && ['fronte', 'entrambi'].includes(opz.posizione || 'fronte') ? figuraCarta(m, opz) : '') +
      '<div class="cb">' + (idx === 0 ? corpoStatCarta(m) : '') + '<div class="cx">' + pezzo.join('') + '</div></div>' +
      pieCarta(m, idx, tot) + '</article>';
  };

  // Misura e divide: prova scale decrescenti; sotto la minima divide in più carte
  let misuratore = null;
  const prendiMisuratore = () => {
    if (!misuratore) { misuratore = document.createElement('div'); misuratore.className = 'misuratore'; misuratore.setAttribute('aria-hidden', 'true'); document.body.appendChild(misuratore); }
    return misuratore;
  };
  const sta = (html) => {
    const box = prendiMisuratore();
    box.innerHTML = html;
    const cb = box.querySelector('.cb');
    return cb.scrollHeight <= cb.clientHeight + 1;
  };
  const SCALE = [1, .94, .88, .82, .77, .72];

  const carte = (m, opz = {}) => {
    const formato = opz.formato || 'poker';
    const blocchi = blocchiCarta(m);
    const html = (lista, idx, tot, s) => cartaHTML(m, formato, lista.map(bloccoHTML), idx, tot, s, opz);
    for (const s of SCALE) {
      const h = html(blocchi, 0, 1, s);
      if (sta(h)) return [h];
    }
    // Prima di dividere: con l'altezza media dell'illustrazione prova quella bassa
    if ((opz.altezza || 'media') === 'media' && opz.immagine !== false) {
      const o2 = { ...opz, altezza: 'bassa' };
      for (const s of SCALE) { const h = cartaHTML(m, formato, blocchi.map(bloccoHTML), 0, 1, s, o2); if (sta(h)) return [h]; }
    }
    // Divisione: riempie ogni carta e, se una voce non entra, la spezza tra due frasi
    const scala = .82;
    const pezzi = [];
    const coda = [...blocchi];
    let corrente = [];
    while (coda.length) {
      const b = coda[0];
      if (sta(html([...corrente, b], pezzi.length, 2, scala))) { corrente.push(coda.shift()); continue; }
      // quante frasi della voce entrano ancora in questa carta?
      const n = frasi(b.testo).length;
      let entra = 0;
      for (let k = n - 1; k >= 1; k--) { if (sta(html([...corrente, taglia(b, k)[0]], pezzi.length, 2, scala))) { entra = k; break; } }
      if (entra) { const [a, resto] = taglia(b, entra); corrente.push(a); coda[0] = resto; }
      else if (!corrente.length) corrente.push(coda.shift()); // una sola frase troppo lunga: va comunque
      pezzi.push(corrente); corrente = [];
    }
    if (corrente.length) pezzi.push(corrente);
    return pezzi.map((p, idx) => html(p, idx, pezzi.length, scala));
  };

  const retro = (m, formato, opz = {}) => {
    const f = FORMATI[formato] || FORMATI.poker;
    const i = opz.immagine !== false && ['retro', 'entrambi'].includes(opz.posizione) && typeof Immagini !== 'undefined' ? Immagini.per(m) : null;
    if (i) { const q = inquadratura(m); return '<article class="carta retro con-fig' + (opz.coloreTipo === false ? ' neutra' : '') + (i.propria ? ' propria' : '') + '" style="--w:' + f.w + 'mm;--h:' + f.h + 'mm;--tinta:' + tinta(m) + ';"><figure class="rt-fig"><img src="' + esc(i.src) + '" alt="" style="object-position:50% ' + (q.y ?? 40) + '%"></figure><div class="rt-nome"><b>' + esc(m.nome) + '</b><small>' + esc(m._tipo || '') + ' · GS ' + T.gsEtichetta(Number(m.grado_sfida?.valore ?? 0)) + '</small></div></article>'; }
    return '<article class="carta retro' + (opz.coloreTipo === false ? ' neutra' : '') + '" style="--w:' + f.w + 'mm;--h:' + f.h + 'mm;--tinta:' + tinta(m) + ';"><div class="rt"><svg viewBox="0 0 48 48" aria-hidden="true"><use href="#segno"/></svg><b>' + esc(m._tipo || '') + '</b><small>Pocket Bestiary</small></div></article>';
  };

  // ── Punto d'ingresso per lo schermo ──
  const disegna = (m, stile, opz = {}) => {
    const o = { dadi: true, ...opz, stile };
    if (stile === 'pocket') return pocket(m, o);
    if (stile === 'carta') { const o = { formato: opz.formato || 'poker', coloreTipo: opz.coloreTipo, immagine: opz.immagine, posizione: opz.posizione, altezza: opz.altezza }; return '<div class="mazzetto">' + carte(m, o).join('') + (o.immagine !== false && ['retro', 'entrambi'].includes(o.posizione) ? retro(m, o.formato, o) : '') + '</div>'; }
    return manuale(m, o);
  };

  // Testo semplice, da incollare in note o chat
  const testoSemplice = (m) => {
    const ed = m._formato || '2024';
    const righe = [m.nome.toUpperCase(), sottotitolo(m), '', (ed === '2014' ? 'Classe Armatura ' : 'CA ') + ca(m) + (ed === '2024' ? '   Iniziativa ' + iniziativa(m) : ''), (ed === '2014' ? 'Punti ferita ' : 'PF ') + pf(m), 'Velocità ' + velocita(m), '',
      CAR.map(([k, s]) => { const c = m.caratteristiche?.[k] || { punteggio: 10, modificatore: 0 }; return s + ' ' + c.punteggio + ' (' + segno(c.modificatore) + ')'; }).join('  '), ''];
    proprieta(m, ed).forEach(([e, v]) => righe.push(e + ' ' + v));
    const pulito = (s) => String(s || '').replace(/\*\*?/g, '');
    SEZIONI.forEach(([k, t]) => { if ((m[k] || []).length) { righe.push('', t.toUpperCase()); m[k].forEach(x => righe.push(pulito(x.nome) + '. ' + pulito(x.descrizione))); } });
    if (m.azioni_leggendarie?.azioni?.length) { righe.push('', 'AZIONI LEGGENDARIE', pulito(m.azioni_leggendarie.descrizione_utilizzi)); m.azioni_leggendarie.azioni.forEach(x => righe.push(pulito(x.nome) + '. ' + pulito(x.descrizione))); }
    return righe.join('\n');
  };

  return { ALTEZZE, STILI, FORMATI, disegna, carte, retro, testoSemplice, sottotitolo };
})();
