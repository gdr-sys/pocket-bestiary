/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   DATI.JS — I mostri: SRD 5.1 (2014), SRD 5.2.1 (2024) e quelli
   dell'utente (homebrew, in localStorage). Ogni mostro ha:
     _ref      chiave unica ("2014:aboleth", "hb:k3x9…")
     _ed       '2014' | '2024' | 'homebrew'
     _formato  '2014' | '2024'  (come si impagina la scheda)
   Il mazzo delle carte e le preferenze stanno qui accanto.
   ============================================================ */

const Dati = (() => {
  const CHIAVI = { hb: 'pb_homebrew', mazzo: 'pb_mazzo', prefs: 'pb_prefs' };
  const leggi = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch (e) { return def; } };
  const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  let srd = [];
  let homebrew = leggi(CHIAVI.hb, []);
  let mazzo = leggi(CHIAVI.mazzo, []);
  let prefs = { tema: 'sistema', colore: 'muschio', stile: 'manuale', colonne: false, formato: 'poker', taglio: true, retro: false, coloreTipo: true, ...leggi(CHIAVI.prefs, {}) };

  const tipoBase = (t) => T.maiuscola(String(t || '').split(/[(,]/)[0].trim().split(' ')[0]) || 'Altro';

  const prepara = (m, ed, formato) => {
    m._ed = ed;
    m._formato = formato;
    m._ref = (ed === 'homebrew' ? 'hb' : ed) + ':' + m.id;
    m._tipo = tipoBase(m.tipo);
    m._gs = Number(m.grado_sfida?.valore ?? 0);
    m._cerca = T.normal(m.nome);
    return m;
  };

  const testoCompleto = (m) => {
    if (m._testo) return m._testo;
    const parti = [m.nome, m.tipo];
    ['tratti', 'azioni', 'azioni_bonus', 'reazioni'].forEach(k => (m[k] || []).forEach(x => parti.push(x.nome, x.descrizione)));
    (m.azioni_leggendarie?.azioni || []).forEach(x => parti.push(x.nome, x.descrizione));
    m._testo = T.normal(parti.join(' '));
    return m._testo;
  };

  const carica = async () => {
    const [a, b] = await Promise.all([
      fetch('data/mostri-2014.json').then(r => r.json()),
      fetch('data/mostri-2024.json').then(r => r.json()),
    ]);
    srd = [
      ...a.map(m => prepara(m, '2014', '2014')),
      ...b.filter(m => m.grado_sfida).map(m => prepara(m, '2024', '2024')),
    ];
    homebrew.forEach(m => prepara(m, 'homebrew', m.formato === '2014' ? '2014' : '2024'));
  };

  const tutti = () => [...homebrew, ...srd];
  const trova = (ref) => tutti().find(m => m._ref === ref) || null;
  // Lo stesso mostro nell'altra edizione (per il confronto)
  const gemello = (m) => {
    if (m._ed === 'homebrew') return null;
    const altra = m._ed === '2014' ? '2024' : '2014';
    const n = T.normal(m.nome);
    return srd.find(x => x._ed === altra && (x.id === m.id || T.normal(x.nome) === n)) || null;
  };

  // ── Homebrew ──
  const pulisci = (m) => {
    const c = JSON.parse(JSON.stringify(m));
    Object.keys(c).forEach(k => { if (k.startsWith('_')) delete c[k]; });
    return c;
  };
  const sync = (tipo, dato) => { if (typeof Account !== 'undefined') Account.cambiato(tipo, dato); };
  const salvaHB = (m, { daRemoto = false } = {}) => {
    const c = pulisci(m);
    if (!c.id || !String(c.id).startsWith('hb')) c.id = 'hb' + T.id();
    if (!daRemoto || !c.aggiornato) c.aggiornato = new Date().toISOString();
    const i = homebrew.findIndex(x => x.id === c.id);
    prepara(c, 'homebrew', c.formato === '2014' ? '2014' : '2024');
    if (i >= 0) homebrew[i] = c; else homebrew.unshift(c);
    const ok = scrivi(CHIAVI.hb, homebrew.map(pulisci));
    if (ok && !daRemoto) sync('mostro', c);
    return ok ? c : null;
  };
  const eliminaHB = (ref) => {
    const via = homebrew.find(m => m._ref === ref);
    if (via) sync('elimina', via.id);
    homebrew = homebrew.filter(m => m._ref !== ref);
    scrivi(CHIAVI.hb, homebrew.map(pulisci));
    mazzo = mazzo.filter(x => x.ref !== ref);
    scrivi(CHIAVI.mazzo, mazzo);
  };
  const esportaHB = () => JSON.stringify({ app: 'Pocket Bestiary', versione: 1, mostri: homebrew.map(pulisci) }, null, 2);
  const importaHB = (testo) => {
    const d = JSON.parse(testo);
    const lista = Array.isArray(d) ? d : (d.mostri || []);
    let n = 0;
    lista.forEach(m => { if (m && m.nome) { salvaHB(m); n++; } });
    return n;
  };

  // ── Mazzo ──
  const aggiungiMazzo = (ref, varianti) => { mazzo.push({ k: T.id(), ref, varianti: { ...(varianti || {}) } }); scrivi(CHIAVI.mazzo, mazzo); sync('stato'); };
  const togliMazzo = (k) => { mazzo = mazzo.filter(x => x.k !== k); scrivi(CHIAVI.mazzo, mazzo); sync('stato'); };
  const svuotaMazzo = () => { mazzo = []; scrivi(CHIAVI.mazzo, mazzo); sync('stato'); };
  const spostaMazzo = (k, d) => {
    const i = mazzo.findIndex(x => x.k === k), j = i + d;
    if (i < 0 || j < 0 || j >= mazzo.length) return;
    [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]];
    scrivi(CHIAVI.mazzo, mazzo);
  };

  const pref = (k, v) => { if (v === undefined) return prefs[k]; prefs[k] = v; scrivi(CHIAVI.prefs, prefs); sync('stato'); return v; };

  return {
    carica, tutti, trova, gemello, testoCompleto, tipoBase,
    get srd() { return srd; }, get homebrew() { return homebrew; }, get mazzo() { return mazzo; },
    salvaHB, eliminaHB, esportaHB, importaHB,
    aggiungiMazzo, togliMazzo, svuotaMazzo, spostaMazzo, pref,
  };
})();
