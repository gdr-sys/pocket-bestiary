/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   EDITOR.JS — Crea e modifica i mostri homebrew. I numeri che
   dipendono da altri (modificatori, tiri salvezza, abilità, PF dai
   dadi vita, Percezione passiva, PE e bonus di competenza) si
   calcolano da soli. L'aiuto "Nuovo attacco" scrive il testo
   dell'azione nel formato dell'edizione scelta.
   ============================================================ */

const Editor = (() => {
  const { esc, CAR, ABILITA, segno, mod, gsEtichetta, num } = T;
  const DIMENSIONI = ['Minuscolo', 'Piccolo', 'Medio', 'Grande', 'Enorme', 'Mastodontico'];
  const DADO_TAGLIA = { Minuscolo: 4, Piccolo: 6, Medio: 8, Grande: 10, Enorme: 12, Mastodontico: 20 };
  const TIPI = ['Aberrazione', 'Bestia', 'Celestiale', 'Costrutto', 'Drago', 'Elementale', 'Folletto', 'Gigante', 'Immondo', 'Melma', 'Mostruosità', 'Non morto', 'Umanoide', 'Vegetale'];
  const ALLINEAMENTI = ['senza allineamento', 'legale buono', 'neutrale buono', 'caotico buono', 'legale neutrale', 'neutrale', 'caotico neutrale', 'legale malvagio', 'neutrale malvagio', 'caotico malvagio', 'qualsiasi allineamento'];
  const ELENCHI = [['tratti', 'Tratti', 'Un tratto passivo, per esempio Anfibio o Resistenza alla magia.'], ['azioni', 'Azioni', ''], ['azioni_bonus', 'Azioni bonus', ''], ['reazioni', 'Reazioni', '']];
  const SKILL = Object.keys(ABILITA).filter(k => k !== 'mano' && k !== 'furto');
  const dimNorm = (d) => { const x = String(d || '').toLowerCase(); return DIMENSIONI.find(D => x.startsWith(D.toLowerCase().slice(0, 4))) || 'Medio'; };

  let S = null;            // stato del modulo
  let stile = 'manuale';
  let quando = null;       // callback dopo il salvataggio
  let immagineNuova = null; // File scelto nell'editor, salvato insieme al mostro
  let togliImmagine = false;

  const vuoto = () => ({
    id: '', nome: 'Nuovo mostro', formato: '2024', dimensione: 'Medio', tipo: 'Mostruosità', allineamento: 'neutrale',
    ca: 13, armatura: '', dv: 4, velocita: { camminata: '9 m', volo: '', nuoto: '', scalata: '', scavare: '' },
    car: { forza: 12, destrezza: 12, costituzione: 12, intelligenza: 6, saggezza: 10, carisma: 6 }, ts: [], ab: {},
    vulnerabilita: '', resistenze: '', immunita_danni: '', immunita_condizione: '', sensi: 'scurovisione 18 m', lingue: '', equipaggiamento: '',
    gs: 1, tratti: [], azioni: [{ nome: 'Morso', descrizione: '' }], azioni_bonus: [], reazioni: [],
    leggUso: '', legg: [],
  });

  // Da un mostro (SRD o homebrew) allo stato del modulo
  const daMostro = (m) => {
    const s = vuoto();
    const bc = m.bonus_competenza ?? GS.competenza(m.grado_sfida?.valore ?? 0);
    s.id = m._ed === 'homebrew' ? m.id : '';
    s.origine = m.origine || (m._ed !== 'homebrew' ? m.id : '');
    s.nome = m.nome; s.formato = m._formato || m.formato || '2024';
    s.dimensione = dimNorm(m.dimensione); s.tipo = m.tipo || ''; s.allineamento = m.allineamento || '';
    s.ca = m.classe_armatura ?? 10; s.armatura = m.armatura || '';
    CAR.forEach(([k]) => { s.car[k] = m.caratteristiche?.[k]?.punteggio ?? 10; });
    s.ts = CAR.map(([k]) => k).filter(k => { const c = m.caratteristiche?.[k]; return c && c.tiro_salvezza !== c.modificatore; });
    s.ab = {};
    Object.entries(m.abilita || {}).forEach(([k, v]) => {
      const key = k === 'mano' || k === 'furto' ? 'rapidita_di_mano' : k;
      const base = mod(s.car[ABILITA[key]?.[1] || 'saggezza']);
      s.ab[key] = v - base >= 2 * bc ? 2 : 1;
    });
    const fm = String(m.punti_ferita?.formula || '').match(/(\d+)d(\d+)/);
    s.dv = fm ? Number(fm[1]) : Math.max(1, Math.round((m.punti_ferita?.media || 10) / 5));
    s.velocita = { camminata: '', volo: '', nuoto: '', scalata: '', scavare: '', ...(m.velocita || {}) };
    ['vulnerabilita', 'resistenze', 'immunita_danni', 'immunita_condizione', 'equipaggiamento'].forEach(k => { s[k] = (m[k] || []).join(', '); });
    s.lingue = (m.lingue || []).join(', ');
    s.sensi = Object.entries(m.sensi || {}).filter(([k]) => !k.startsWith('percezione_passiva')).map(([k, v]) => (T.SENSI[k] || k.replace(/_/g, ' ')) + (typeof v === 'string' ? ' ' + v : '')).join(', ');
    s.gs = Number(m.grado_sfida?.valore ?? 1);
    ELENCHI.forEach(([k]) => { s[k] = (m[k] || []).map(x => ({ nome: x.nome, descrizione: x.descrizione })); });
    s.leggUso = m.azioni_leggendarie?.descrizione_utilizzi || '';
    s.leggN = m.azioni_leggendarie?.utilizzi || '';
    s.legg = (m.azioni_leggendarie?.azioni || []).map(x => ({ nome: x.nome, descrizione: x.descrizione }));
    s.dadoForzato = fm ? Number(fm[2]) : null;
    return s;
  };

  // Dallo stato al mostro (stessa forma dei dati SRD)
  const costruisci = () => {
    const bc = GS.competenza(S.gs);
    const caratteristiche = {};
    CAR.forEach(([k]) => { const p = Number(S.car[k]) || 10, md = mod(p); caratteristiche[k] = { punteggio: p, modificatore: md, tiro_salvezza: md + (S.ts.includes(k) ? bc : 0) }; });
    const abilita = {};
    Object.entries(S.ab).forEach(([k, liv]) => { if (liv) abilita[k] = caratteristiche[ABILITA[k][1]].modificatore + bc * liv; });
    const dado = S.dadoForzato || DADO_TAGLIA[S.dimensione] || 8;
    const dv = Math.max(1, Number(S.dv) || 1);
    const bonusPF = dv * caratteristiche.costituzione.modificatore;
    const media = Math.max(1, Math.floor(dv * (dado + 1) / 2) + bonusPF);
    const sensi = {};
    String(S.sensi || '').split(',').map(x => x.trim()).filter(Boolean).forEach(p => {
      const x = p.match(/^(.*?)\s+(\d[\d,.]*\s*m.*)$/);
      const nome = (x ? x[1] : p).toLowerCase();
      const k = Object.keys(T.SENSI).find(j => T.SENSI[j] === nome) || nome.replace(/\s+/g, '_');
      sensi[k] = x ? x[2] : true;
    });
    sensi.percezione_passiva = 10 + (abilita.percezione ?? caratteristiche.saggezza.modificatore);
    const lista = (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
    const vel = {};
    Object.entries(S.velocita).forEach(([k, v]) => { if (String(v).trim()) vel[k] = String(v).trim(); });
    const m = {
      id: S.id || '', origine: S.origine || undefined, nome: S.nome.trim() || 'Senza nome', formato: S.formato,
      tipo: S.tipo, dimensione: S.dimensione, allineamento: S.allineamento,
      classe_armatura: Number(S.ca) || 10, armatura: S.armatura.trim(),
      punti_ferita: { media, formula: dv + 'd' + dado + (bonusPF ? ' ' + (bonusPF > 0 ? '+' : '−') + ' ' + Math.abs(bonusPF) : '') },
      velocita: vel, caratteristiche, abilita, sensi,
      vulnerabilita: lista(S.vulnerabilita), resistenze: lista(S.resistenze), immunita_danni: lista(S.immunita_danni), immunita_condizione: lista(S.immunita_condizione),
      lingue: lista(S.lingue), equipaggiamento: lista(S.equipaggiamento),
      grado_sfida: { valore: S.gs, punti_esperienza: GS.pe(S.gs) }, bonus_competenza: bc,
      iniziativa: { bonus: caratteristiche.destrezza.modificatore, valore: 10 + caratteristiche.destrezza.modificatore },
    };
    ELENCHI.forEach(([k]) => { m[k] = S[k].filter(x => x.nome.trim() || x.descrizione.trim()).map(x => ({ nome: x.nome.trim(), descrizione: x.descrizione.trim() })); });
    if (S.legg.some(x => x.nome.trim())) m.azioni_leggendarie = { utilizzi: S.leggN || '3', descrizione_utilizzi: S.leggUso.trim(), azioni: S.legg.filter(x => x.nome.trim()).map(x => ({ nome: x.nome.trim(), descrizione: x.descrizione.trim() })) };
    ['vulnerabilita', 'resistenze', 'immunita_danni', 'immunita_condizione', 'lingue', 'equipaggiamento'].forEach(k => { if (!m[k].length) delete m[k]; });
    if (!Object.keys(m.abilita).length) delete m.abilita;
    m._ed = 'homebrew'; m._formato = S.formato; m._tipo = Dati.tipoBase(S.tipo);
    return m;
  };

  // ── Modulo ──
  const campo = (lab, html, aiuto) => '<label class="campo-lab">' + lab + html + (aiuto ? '<span class="aiuto">' + aiuto + '</span>' : '') + '</label>';
  const inp = (k, v, extra = '') => '<input class="campo" data-k="' + k + '" value="' + esc(v) + '" ' + extra + '>';
  const sel = (k, opzioni, v) => '<select class="campo" data-k="' + k + '">' + opzioni.map(o => { const [val, et] = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(et) + '</option>'; }).join('') + '</select>';
  const ICONA_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICONA_SU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';

  const elencoVoci = (k, voci) => '<div class="voci-lista">' + voci.map((x, i) =>
    '<div class="voce-ed"><div class="voce-ed-testa"><label class="vis-nascosto" for="v-' + k + '-' + i + '">Nome</label><input class="campo" id="v-' + k + '-' + i + '" data-voce="' + k + '" data-i="' + i + '" data-c="nome" value="' + esc(x.nome) + '" placeholder="Nome">' +
    (i > 0 ? '<button type="button" class="icona-btn" data-su="' + k + '" data-i="' + i + '" aria-label="Sposta su">' + ICONA_SU + '</button>' : '') +
    '<button type="button" class="icona-btn pericolo" data-togli="' + k + '" data-i="' + i + '" aria-label="Togli ' + esc(x.nome || 'voce') + '">' + ICONA_X + '</button></div>' +
    '<label class="vis-nascosto" for="d-' + k + '-' + i + '">Descrizione</label><textarea class="campo" id="d-' + k + '-' + i + '" data-voce="' + k + '" data-i="' + i + '" data-c="descrizione" rows="3" placeholder="Cosa fa. Usa *asterischi* per il corsivo.">' + esc(x.descrizione) + '</textarea></div>'
  ).join('') + '</div>';

  const modulo = () => {
    const f = document.getElementById('editor');
    const gsOpz = GS.LISTA.map(v => [v, 'GS ' + gsEtichetta(v) + ' · ' + num(GS.pe(v)) + ' PE']);
    f.innerHTML =
      '<section class="blocco"><h2>Chi è</h2>' +
        '<div class="griglia due">' + campo('Nome', inp('nome', S.nome, 'required maxlength="80"')) +
        '<div class="campo-lab">Impaginazione<div class="segmenti" role="group" aria-label="Impaginazione">' + ['2014', '2024'].map(e => '<button type="button" data-formato="' + e + '" aria-pressed="' + (S.formato === e) + '">' + e + '</button>').join('') + '</div></div></div>' +
        '<div class="griglia">' + campo('Taglia', sel('dimensione', DIMENSIONI, S.dimensione)) + campo('Tipo', inp('tipo', S.tipo, 'list="pb-tipi"')) + campo('Allineamento', inp('allineamento', S.allineamento, 'list="pb-allineamenti"')) + '</div>' +
        '<datalist id="pb-tipi">' + TIPI.map(t => '<option value="' + t + '">').join('') + '</datalist><datalist id="pb-allineamenti">' + ALLINEAMENTI.map(t => '<option value="' + t + '">').join('') + '</datalist>' +
      '</section>' +

      '<section class="blocco"><div class="blocco-testa"><h2>Illustrazione</h2><div class="riga-btn"><label class="btn quieto piccolo" for="ed-img">' + (S.id && Immagini.haPropria('hb:' + S.id) || immagineNuova ? 'Cambia immagine' : 'Carica un’immagine') + '</label>' + ((S.id && Immagini.haPropria('hb:' + S.id) && !togliImmagine) || immagineNuova ? '<button type="button" class="btn quieto piccolo" data-togli-img>Togli</button>' : '') + '</div></div>' +
        '<input type="file" id="ed-img" accept="image/*" hidden>' +
        '<p class="quieto-testo">' + (immagineNuova ? 'Immagine scelta: ' + T.esc(immagineNuova.name) + '. Si salva con il mostro.' : 'Senza immagine il mostro usa l’illustrazione del suo tipo. JPG, PNG o WebP: la riduco io.') + '</p>' +
      '</section>' +

      '<section class="blocco"><div class="blocco-testa"><h2>Grado di Sfida</h2><span class="quieto-testo" id="ed-bc"></span></div>' +
        '<div class="griglia due">' + campo('GS', sel('gs', gsOpz, S.gs), 'Cambia anche il bonus di competenza: tiri salvezza e abilità si aggiornano.') + '</div>' +
      '</section>' +

      '<section class="blocco"><h2>Difesa e movimento</h2>' +
        '<div class="griglia">' + campo('Classe Armatura', inp('ca', S.ca, 'type="number" min="1" max="30" inputmode="numeric"')) + campo('Armatura', inp('armatura', S.armatura, 'placeholder="armatura naturale"')) +
        campo('Dadi vita', inp('dv', S.dv, 'type="number" min="1" max="99" inputmode="numeric"'), '<span id="ed-pf"></span>') + '</div>' +
        '<div class="griglia">' + [['camminata', 'Camminare'], ['volo', 'Volare'], ['nuoto', 'Nuotare'], ['scalata', 'Scalare'], ['scavare', 'Scavare']].map(([k, n]) => campo(n, inp('vel.' + k, S.velocita[k] || '', 'placeholder="—"'))).join('') + '</div>' +
      '</section>' +

      '<section class="blocco"><h2>Caratteristiche</h2><div class="griglia sei">' + CAR.map(([k, s, nome]) =>
        '<div class="car"><b>' + s + '</b><label class="vis-nascosto" for="car-' + k + '">' + nome + '</label><input class="campo" id="car-' + k + '" type="number" min="1" max="30" inputmode="numeric" data-k="car.' + k + '" value="' + S.car[k] + '"><span class="mod" data-mod="' + k + '"></span>' +
        '<label><input type="checkbox" data-ts="' + k + '"' + (S.ts.includes(k) ? ' checked' : '') + '> TS</label></div>').join('') + '</div>' +
        '<div><span class="etichetta">Abilità: un tocco per la competenza, due per la maestria</span><div class="filtri" id="ed-abilita">' + SKILL.map(k => '<button type="button" class="scelta" data-ab="' + k + '"></button>').join('') + '</div></div>' +
      '</section>' +

      '<section class="blocco"><h2>Sensi, lingue e difese</h2><div class="griglia due">' +
        campo('Sensi', inp('sensi', S.sensi, 'placeholder="scurovisione 18 m, vista cieca 3 m"'), 'La Percezione passiva si calcola da sola.') + campo('Lingue', inp('lingue', S.lingue, 'placeholder="Comune, Draconico"')) +
        campo('Vulnerabilità', inp('vulnerabilita', S.vulnerabilita, 'placeholder="fuoco"')) + campo('Resistenze', inp('resistenze', S.resistenze, 'placeholder="freddo, veleno"')) +
        campo('Immunità ai danni', inp('immunita_danni', S.immunita_danni)) + campo('Immunità alle condizioni', inp('immunita_condizione', S.immunita_condizione, 'placeholder="spaventato, avvelenato"')) +
        campo('Equipaggiamento', inp('equipaggiamento', S.equipaggiamento), 'Compare solo nelle schede 2024.') +
      '</div></section>' +

      ELENCHI.map(([k, t, aiuto]) => '<section class="blocco"><div class="blocco-testa"><h2>' + t + '</h2><div class="riga-btn">' +
        (k === 'azioni' ? '<button type="button" class="btn quieto piccolo" data-attacco>Nuovo attacco</button>' : '') +
        '<button type="button" class="btn quieto piccolo" data-aggiungi="' + k + '">Aggiungi</button></div></div>' +
        (k === 'azioni' ? '<div class="attacco-aiuto" id="attacco-aiuto" hidden></div>' : '') +
        (S[k].length ? elencoVoci(k, S[k]) : '<p class="quieto-testo">' + (aiuto || 'Nessuna voce.') + '</p>') + '</section>').join('') +

      '<section class="blocco"><div class="blocco-testa"><h2>Azioni leggendarie</h2><button type="button" class="btn quieto piccolo" data-aggiungi="legg">Aggiungi</button></div>' +
        (S.legg.length ? campo('Introduzione', '<textarea class="campo" data-k="leggUso" rows="2">' + esc(S.leggUso) + '</textarea>') + elencoVoci('legg', S.legg) : '<p class="quieto-testo">Per i mostri da boss: azioni da usare alla fine del turno degli altri.</p>') +
      '</section>' +

      '<div class="barra-salva"><button type="button" class="btn quieto vai-anteprima" data-anteprima>Anteprima</button>' + (S.id ? '<button type="button" class="btn quieto" data-annulla>Annulla</button>' : '<button type="button" class="btn quieto" data-ricomincia>Ricomincia</button>') + '<button type="submit" class="btn azione">' + (S.id ? 'Salva le modifiche' : 'Salva tra i miei') + '</button></div>';
    aggiornaCalcoli();
  };

  const aggiornaCalcoli = () => {
    const f = document.getElementById('editor');
    const bc = GS.competenza(S.gs);
    CAR.forEach(([k]) => { const el = f.querySelector('[data-mod="' + k + '"]'); if (el) { const md = mod(S.car[k]); el.textContent = segno(md) + (S.ts.includes(k) ? ' · TS ' + segno(md + bc) : ''); } });
    f.querySelectorAll('[data-ab]').forEach(b => {
      const k = b.dataset.ab, liv = S.ab[k] || 0, md = mod(S.car[ABILITA[k][1]]);
      b.setAttribute('aria-pressed', liv ? 'true' : 'false');
      b.textContent = ABILITA[k][0] + (liv ? ' ' + segno(md + bc * liv) + (liv === 2 ? ' (maestria)' : '') : '');
    });
    const m = costruisci();
    const pf = f.querySelector('#ed-pf'); if (pf) pf.textContent = m.punti_ferita.media + ' PF (' + m.punti_ferita.formula + ')';
    const eb = f.querySelector('#ed-bc'); if (eb) eb.textContent = 'Bonus di competenza ' + segno(bc) + ' · ' + num(GS.pe(S.gs)) + ' PE';
    anteprima(m);
  };

  let urlNuova = null;
  const anteprima = (m) => {
    if (immagineNuova) { if (!urlNuova) urlNuova = URL.createObjectURL(immagineNuova); m.immagine = urlNuova; }
    else if (togliImmagine) m.immagine = null;
    else if (S.id) m._ref = 'hb:' + S.id;
    document.getElementById('palco-crea').innerHTML = Schede.disegna(m, stile, { ...Pocket.opzSchede(), dadi: false, colonne: false });
    const st = GS.stima(m);
    document.getElementById('stima').innerHTML = 'Stima dalla Guida del DM: <span>difesa <b>GS ' + gsEtichetta(st.difensivo) + '</b></span><span>attacco <b>GS ' + gsEtichetta(st.offensivo) + '</b> (' + st.dpr + ' danni a round)</span><span>media <b>GS ' + gsEtichetta(st.medio) + '</b></span>';
  };

  // ── Aiuto per gli attacchi ──
  const aiutoAttacco = () => {
    const box = document.getElementById('attacco-aiuto');
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<div class="griglia">' +
      campo('Nome', '<input class="campo" id="att-nome" value="Artiglio">') +
      campo('Tipo', '<select class="campo" id="att-tipo"><option value="mischia">In mischia</option><option value="distanza">A distanza</option></select>') +
      campo('Caratteristica', '<select class="campo" id="att-car"><option value="forza">Forza</option><option value="destrezza">Destrezza</option></select>') +
      campo('Portata o gittata', '<input class="campo" id="att-portata" value="1,5 m">') +
      campo('Dadi di danno', '<input class="campo" id="att-dado" value="1d8">') +
      campo('Tipo di danno', '<select class="campo" id="att-danno">' + GS.TIPI_DANNO.map(t => '<option>' + t + '</option>').join('') + '</select>') +
      '</div><div class="riga-btn"><button type="button" class="btn azione piccolo" id="att-inserisci">Inserisci tra le azioni</button></div>';
    box.querySelector('#att-tipo').addEventListener('change', (e) => { box.querySelector('#att-portata').value = e.target.value === 'mischia' ? '1,5 m' : '24/96 m'; box.querySelector('#att-car').value = e.target.value === 'mischia' ? 'forza' : 'destrezza'; });
    box.querySelector('#att-inserisci').addEventListener('click', () => {
      const g = (id) => box.querySelector('#att-' + id).value.trim();
      const md = mod(S.car[g('car')]), bc = GS.competenza(S.gs);
      const dm = g('dado').match(/(\d+)d(\d+)/) || [0, 1, 6];
      const media = Math.max(1, Math.floor(dm[1] * (+dm[2] + 1) / 2) + md);
      const danni = media + ' (' + dm[1] + 'd' + dm[2] + (md ? ' ' + (md > 0 ? '+' : '−') + ' ' + Math.abs(md) : '') + ') danni ' + g('danno');
      const mis = g('tipo') === 'mischia';
      const desc = S.formato === '2014'
        ? 'Attacco con arma ' + (mis ? 'da mischia' : 'a distanza') + ': ' + segno(md + bc) + ' al tiro per colpire, ' + (mis ? 'portata ' : 'gittata ') + g('portata') + ', un bersaglio. Colpito: ' + danni + '.'
        : '*Tiro per colpire ' + (mis ? 'in mischia' : 'a distanza') + ':* ' + segno(md + bc) + ', ' + (mis ? 'portata ' : 'gittata ') + g('portata') + '. *Colpito:* ' + danni + '.';
      S.azioni.push({ nome: g('nome') || 'Attacco', descrizione: desc });
      modulo();
      Pocket.avviso('Attacco aggiunto tra le azioni');
    });
  };

  // ── Eventi ──
  const imposta = (k, v) => {
    if (k.startsWith('car.')) S.car[k.slice(4)] = Math.max(1, Math.min(30, Number(v) || 10));
    else if (k.startsWith('vel.')) S.velocita[k.slice(4)] = v;
    else if (k === 'gs') S.gs = Number(v);
    else if (k === 'dimensione') { S.dimensione = v; S.dadoForzato = null; }
    else S[k] = v;
  };

  const collega = () => {
    const f = document.getElementById('editor');
    f.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.k) imposta(t.dataset.k, t.value);
      else if (t.dataset.voce) S[t.dataset.voce][+t.dataset.i][t.dataset.c] = t.value;
      else if (t.dataset.ts) { const k = t.dataset.ts; S.ts = t.checked ? [...new Set([...S.ts, k])] : S.ts.filter(x => x !== k); }
      else return;
      if (t.dataset.k === 'nome') document.getElementById('titolo-crea').textContent = t.value || 'Nuovo mostro';
      aggiornaCalcoli();
    });
    f.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' && e.target.dataset.k) { imposta(e.target.dataset.k, e.target.value); aggiornaCalcoli(); } });
    f.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.formato) { S.formato = b.dataset.formato; f.querySelectorAll('[data-formato]').forEach(x => x.setAttribute('aria-pressed', x === b)); aggiornaCalcoli(); }
      else if (b.dataset.ab) { const k = b.dataset.ab; S.ab[k] = ((S.ab[k] || 0) + 1) % 3; aggiornaCalcoli(); }
      else if (b.dataset.aggiungi) { const k = b.dataset.aggiungi; S[k].push({ nome: '', descrizione: '' }); if (k === 'legg' && !S.leggUso) S.leggUso = 'Utilizzi di azioni leggendarie: 3. Subito dopo il turno di un\'altra creatura, ' + (S.nome || 'il mostro') + ' può consumare un utilizzo per effettuare una delle azioni seguenti. Recupera tutti gli utilizzi all\'inizio del proprio turno.'; modulo(); const ultimi = f.querySelectorAll('[data-voce="' + k + '"][data-c="nome"]'); ultimi[ultimi.length - 1]?.focus(); }
      else if (b.dataset.togli) { S[b.dataset.togli].splice(+b.dataset.i, 1); modulo(); }
      else if (b.dataset.su) { const a = S[b.dataset.su], i = +b.dataset.i; [a[i - 1], a[i]] = [a[i], a[i - 1]]; modulo(); }
      else if (b.hasAttribute('data-attacco')) aiutoAttacco();
      else if (b.hasAttribute('data-anteprima')) document.querySelector('.anteprima').scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (b.hasAttribute('data-ricomincia')) { apri(); }
      else if (b.hasAttribute('data-annulla')) { location.hash = '#bestiario'; }
    });
    f.addEventListener('change', (ev) => {
      if (ev.target.id !== 'ed-img') return;
      const file = ev.target.files[0]; ev.target.value = '';
      if (!file) return;
      if (file.size > 15e6) { Pocket.avviso('L’immagine è troppo grande: scegline una sotto i 15 MB'); return; }
      immagineNuova = file; togliImmagine = false; if (urlNuova) { URL.revokeObjectURL(urlNuova); urlNuova = null; }
      modulo();
    });
    f.addEventListener('click', (ev) => { if (ev.target.closest('[data-togli-img]')) { immagineNuova = null; if (urlNuova) { URL.revokeObjectURL(urlNuova); urlNuova = null; } togliImmagine = !!S.id; modulo(); } });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!S.nome.trim()) { Pocket.avviso('Dai un nome al mostro prima di salvarlo'); f.querySelector('[data-k="nome"]').focus(); return; }
      const m = costruisci();
      m.editor = { dv: S.dv, dado: S.dadoForzato || null };
      const salvato = Dati.salvaHB(m);
      if (!salvato) { Pocket.avviso('Non riesco a salvare: lo spazio del browser è pieno. Salva i tuoi mostri in un file dalle Impostazioni.'); return; }
      Pocket.avviso((S.id ? 'Modifiche salvate: ' : 'Salvato tra i tuoi: ') + salvato.nome);
      S.id = salvato.id;
      const ref = 'hb:' + salvato.id;
      const dopo = immagineNuova ? Immagini.imposta(ref, immagineNuova) : (togliImmagine ? Immagini.togli(ref) : Promise.resolve());
      dopo.catch(() => Pocket.avviso('Il mostro è salvato, ma non riesco a leggere l’immagine. Prova con un JPG o PNG.'))
        .finally(() => { immagineNuova = null; togliImmagine = false; if (urlNuova) { URL.revokeObjectURL(urlNuova); urlNuova = null; } if (typeof Account !== 'undefined') Account.cambiato('mostro', salvato); if (quando) quando(salvato); });
      return;
    });

    const st = document.getElementById('stili-crea');
    st.innerHTML = Schede.STILI.map(s => '<button type="button" data-stile="' + s.id + '" aria-pressed="' + (s.id === stile) + '">' + s.nome + '</button>').join('');
    st.addEventListener('click', (e) => { const b = e.target.closest('[data-stile]'); if (!b) return; stile = b.dataset.stile; st.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); anteprima(costruisci()); });
  };

  let collegato = false;
  // apri(): mostro vuoto; apri(m): modifica (homebrew) o copia (SRD, con le varianti già applicate)
  const apri = (m, cb) => {
    if (!collegato) { collega(); collegato = true; }
    stile = Dati.pref('stile') === 'carta' ? 'manuale' : (Dati.pref('stile') || 'manuale');
    document.querySelectorAll('#stili-crea button').forEach(x => x.setAttribute('aria-pressed', x.dataset.stile === stile));
    S = m ? daMostro(m) : vuoto();
    immagineNuova = null; togliImmagine = false;
    if (m && m._ed === 'homebrew' && m.editor?.dado) S.dadoForzato = m.editor.dado;
    quando = cb || null;
    document.getElementById('titolo-crea').textContent = S.id ? S.nome : (m ? S.nome : 'Nuovo mostro');
    modulo();
  };

  return { apri, costruisci };
})();
