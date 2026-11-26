/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   GS.JS — Cambio del Grado di Sfida, nome e tipo di danno.
   Viene da mostri-modificabili.js di Pocket GM Screen.

   Il cambio di GS segue la tabella "Statistiche dei mostri per GS"
   della Guida del DM (2014): per ogni GS ci sono CA, PF, bonus per
   colpire, danni per round e CD attesi. Ogni valore si sposta della
   stessa differenza tra GS di partenza e scelto (CA, attacco, CD,
   competenza) o nella stessa proporzione (PF e danni, ricalcolando
   il numero di dadi). Le azioni sono testo: si aggiornano le parti
   riconoscibili ("+4 al tiro per colpire", "5 (1d6 + 2) danni",
   "CD 13"), sia nel formato 2014 sia nel 2024.

   In più: stima del GS di un mostro (difensivo, offensivo, medio)
   per l'editor homebrew.
   ============================================================ */

const GS = (() => {
  // GS: [competenza, CA, PF min, PF max, attacco, danni min, danni max, CD, PE]
  const TABELLA = {
    0: [2, 13, 1, 6, 3, 0, 1, 13, 10], 0.125: [2, 13, 7, 35, 3, 2, 3, 13, 25], 0.25: [2, 13, 36, 49, 3, 4, 5, 13, 50], 0.5: [2, 13, 50, 70, 3, 6, 8, 13, 100],
    1: [2, 13, 71, 85, 3, 9, 14, 13, 200], 2: [2, 13, 86, 100, 3, 15, 20, 13, 450], 3: [2, 13, 101, 115, 4, 21, 26, 13, 700], 4: [2, 14, 116, 130, 5, 27, 32, 14, 1100],
    5: [3, 15, 131, 145, 6, 33, 38, 15, 1800], 6: [3, 15, 146, 160, 6, 39, 44, 15, 2300], 7: [3, 15, 161, 175, 6, 45, 50, 15, 2900], 8: [3, 16, 176, 190, 7, 51, 56, 16, 3900],
    9: [4, 16, 191, 205, 7, 57, 62, 16, 5000], 10: [4, 17, 206, 220, 7, 63, 68, 16, 5900], 11: [4, 17, 221, 235, 8, 69, 74, 17, 7200], 12: [4, 17, 236, 250, 8, 75, 80, 17, 8400],
    13: [5, 18, 251, 265, 8, 81, 86, 18, 10000], 14: [5, 18, 266, 280, 8, 87, 92, 18, 11500], 15: [5, 18, 281, 295, 8, 93, 98, 18, 13000], 16: [5, 18, 296, 310, 9, 99, 104, 18, 15000],
    17: [6, 19, 311, 325, 10, 105, 110, 19, 18000], 18: [6, 19, 326, 340, 10, 111, 116, 19, 20000], 19: [6, 19, 341, 355, 10, 117, 122, 19, 22000], 20: [6, 19, 356, 400, 10, 123, 140, 19, 25000],
    21: [7, 19, 401, 445, 11, 141, 158, 20, 33000], 22: [7, 19, 446, 490, 11, 159, 176, 20, 41000], 23: [7, 19, 491, 535, 11, 177, 194, 20, 50000], 24: [7, 19, 536, 580, 12, 195, 212, 21, 62000],
    25: [8, 19, 581, 625, 12, 213, 230, 21, 75000], 26: [8, 19, 626, 670, 12, 231, 248, 21, 90000], 27: [8, 19, 671, 715, 13, 249, 266, 22, 105000], 28: [8, 19, 716, 760, 13, 267, 284, 22, 120000],
    29: [9, 19, 761, 805, 13, 285, 302, 22, 135000], 30: [9, 19, 806, 850, 14, 303, 320, 23, 155000],
  };
  const LISTA = Object.keys(TABELLA).map(Number).sort((a, b) => a - b);
  const vicino = (v) => LISTA.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, LISTA[0]);
  const riga = (gs) => TABELLA[vicino(gs)];
  const midPF = (gs) => { const r = riga(gs); return (r[2] + r[3]) / 2; };
  const midDanni = (gs) => { const r = riga(gs); return Math.max(0.5, (r[5] + r[6]) / 2); };
  const pe = (gs) => riga(gs)[8];
  const competenza = (gs) => riga(gs)[0];
  const passo = (gs, d) => LISTA[Math.max(0, Math.min(LISTA.length - 1, LISTA.indexOf(vicino(gs)) + d))];

  const TIPI_DANNO = ['taglienti', 'perforanti', 'contundenti', 'da fuoco', 'da freddo', 'da fulmine', 'da tuono', 'da acido', 'da veleno', 'necrotici', 'radiosi', 'psichici', 'da forza'];
  const RE_DANNO = /danni (taglienti|perforanti|contundenti|da fuoco|da freddo|da fulmine|da tuono|da acido|da veleno|necrotici|radiosi|psichici|da forza)/g;
  const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const scalaDadi = (avg, facce, mod, ratio) => {
    const obiettivo = Math.max(1, avg * ratio);
    const n = Math.max(1, Math.round((obiettivo - mod) / ((facce + 1) / 2)));
    return { n, media: Math.max(1, Math.floor(n * (facce + 1) / 2 + mod)) };
  };

  const testo = (t, s) => {
    if (!t) return t;
    let out = String(t);
    if (s.attacco) {
      out = out.replace(/\+(\d+)( al tiro per colpire)/g, (_, n, r) => '+' + (Number(n) + s.attacco) + r);
      out = out.replace(/(Tiro per colpire[^:]*:\*?\s*)\+(\d+)/g, (_, p, n) => p + '+' + (Number(n) + s.attacco));
    }
    if (s.cd) out = out.replace(/CD (\d+)/g, (_, n) => 'CD ' + (Number(n) + s.cd));
    if (s.danni !== 1) {
      out = out.replace(/(\d+) \((\d+)d(\d+)(?:\s*([+\-−])\s*(\d+))?\)/g, (orig, avg, n, f, segno, m) => {
        const mod = m ? (segno === '+' ? 1 : -1) * Number(m) : 0;
        const r = scalaDadi(Number(avg), Number(f), mod, s.danni);
        return r.media + ' (' + r.n + 'd' + f + (m ? ' ' + (mod >= 0 ? '+' : '−') + ' ' + Math.abs(mod) : '') + ')';
      });
    }
    if (s.tipoDanno) out = out.replace(RE_DANNO, 'danni ' + s.tipoDanno);
    if (s.nome && s.vecchioNome) {
      out = out.replace(new RegExp('\\b' + escRe(s.vecchioNome) + '\\b', 'g'), s.nome)
               .replace(new RegExp('\\b' + escRe(s.vecchioNome.toLowerCase()) + '\\b', 'g'), s.nome.toLowerCase());
    }
    return out;
  };

  // varianti: { gs, nome, tipoDanno }
  const applica = (base, varianti = {}) => {
    const m = JSON.parse(JSON.stringify(base));
    const gsDa = Number(base.grado_sfida?.valore ?? 0);
    const gsA = varianti.gs != null && varianti.gs !== '' ? Number(varianti.gs) : gsDa;
    const da = riga(gsDa), a = riga(gsA);
    const s = {
      attacco: gsA !== gsDa ? a[4] - da[4] : 0,
      cd: gsA !== gsDa ? a[7] - da[7] : 0,
      danni: gsA !== gsDa ? midDanni(gsA) / midDanni(gsDa) : 1,
      tipoDanno: varianti.tipoDanno || '',
      nome: (varianti.nome || '').trim(),
      vecchioNome: base.nome,
    };

    if (gsA !== gsDa) {
      const prof = a[0] - da[0];
      m.classe_armatura = Math.max(5, Number(base.classe_armatura || 10) + (a[1] - da[1]));
      const pf = base.punti_ferita || {};
      const fm = String(pf.formula || '').match(/(\d+)d(\d+)(?:\s*([+\-−])\s*(\d+))?/);
      const obiettivo = Math.max(1, Math.round((pf.media || 1) * midPF(gsA) / midPF(gsDa)));
      if (fm) {
        const n0 = Number(fm[1]), f = Number(fm[2]);
        const bonusTot = fm[4] ? (fm[3] === '+' ? 1 : -1) * Number(fm[4]) : 0;
        const perDado = bonusTot / n0;
        const n = Math.max(1, Math.round(obiettivo / ((f + 1) / 2 + perDado)));
        const bonus = Math.round(perDado * n);
        m.punti_ferita = { media: Math.max(1, Math.floor(n * (f + 1) / 2 + bonus)), formula: n + 'd' + f + (bonus ? ' ' + (bonus > 0 ? '+' : '−') + ' ' + Math.abs(bonus) : '') };
      } else {
        m.punti_ferita = { media: obiettivo, formula: '' };
      }
      m.bonus_competenza = a[0];
      Object.values(m.caratteristiche || {}).forEach(c => { if (c.tiro_salvezza !== c.modificatore) c.tiro_salvezza += prof; });
      Object.keys(m.abilita || {}).forEach(k => { m.abilita[k] += prof; });
      if (m.abilita?.percezione != null && m.sensi) m.sensi.percezione_passiva = 10 + m.abilita.percezione;
      m.grado_sfida = { valore: gsA, punti_esperienza: a[8] };
    }

    const soloNome = { ...s, attacco: 0, cd: 0, danni: 1, tipoDanno: '' };
    ['tratti', 'azioni', 'azioni_bonus', 'reazioni'].forEach(k => {
      if (Array.isArray(m[k])) m[k] = m[k].map(x => ({ nome: s.nome ? testo(x.nome, soloNome) : x.nome, descrizione: testo(x.descrizione, s) }));
    });
    if (m.azioni_leggendarie?.azioni) m.azioni_leggendarie.azioni = m.azioni_leggendarie.azioni.map(x => ({ ...x, descrizione: testo(x.descrizione, s) }));
    if (m.azioni_leggendarie?.descrizione_utilizzi) m.azioni_leggendarie.descrizione_utilizzi = testo(m.azioni_leggendarie.descrizione_utilizzi, soloNome);
    if (s.nome) m.nome = s.nome;
    m._variante = (gsA !== gsDa || s.nome || s.tipoDanno) ? { daGS: gsDa, aGS: gsA } : null;
    return m;
  };

  // ── Stima del GS (metodo della Guida del DM, semplificato) ──
  const gsDaPF = (pf) => { for (const g of LISTA) { const r = TABELLA[g]; if (pf <= r[3]) return g; } return 30; };
  const gsDaDanni = (d) => { for (const g of LISTA) { const r = TABELLA[g]; if (d <= r[6]) return g; } return 30; };
  const sposta = (g, n) => passo(g, Math.trunc(n));

  // Danni medi per round: la somma dei "N (XdY)" dell'azione più forte, moltiplicata dal Multiattacco
  const danniPerRound = (m) => {
    const azioni = (m.azioni || []).filter(a => !/multiattacco/i.test(a.nome || ''));
    const somma = (t) => [...String(t || '').matchAll(/(\d+) \(\d+d\d+/g)].reduce((s, x) => s + Number(x[1]), 0);
    let migliore = 0;
    azioni.forEach(a => { migliore = Math.max(migliore, somma(a.descrizione)); });
    const multi = (m.azioni || []).find(a => /multiattacco/i.test(a.nome || ''));
    const PAROLE = { due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6 };
    let colpi = 1;
    if (multi) { const w = String(multi.descrizione).toLowerCase().match(/\b(due|tre|quattro|cinque|sei)\b/); colpi = w ? PAROLE[w[1]] : 2; }
    return Math.round(migliore * colpi);
  };
  const migliorAttacco = (m) => {
    let best = null;
    (m.azioni || []).forEach(a => {
      const t = String(a.descrizione || '');
      const x = t.match(/\+(\d+) al tiro per colpire/) || t.match(/Tiro per colpire[^:]*:\*?\s*\+(\d+)/);
      if (x) best = Math.max(best ?? -99, Number(x[1]));
    });
    return best;
  };
  const migliorCD = (m) => {
    let best = null;
    [...(m.azioni || []), ...(m.tratti || [])].forEach(a => { [...String(a.descrizione || '').matchAll(/CD (\d+)/g)].forEach(x => { best = Math.max(best ?? 0, Number(x[1])); }); });
    return best;
  };

  const stima = (m) => {
    const pf = Number(m.punti_ferita?.media || 1);
    const ca = Number(m.classe_armatura || 10);
    let dif = gsDaPF(pf);
    dif = sposta(dif, (ca - riga(dif)[1]) / 2);
    const dpr = danniPerRound(m);
    let off = gsDaDanni(dpr);
    const att = migliorAttacco(m), cd = migliorCD(m);
    if (att != null) off = sposta(off, (att - riga(off)[4]) / 2);
    else if (cd != null) off = sposta(off, (cd - riga(off)[7]) / 2);
    const media = vicino((dif + off) / 2);
    return { difensivo: dif, offensivo: off, medio: media, dpr };
  };

  return { TABELLA, LISTA, vicino, riga, pe, competenza, passo, TIPI_DANNO, applica, stima };
})();
