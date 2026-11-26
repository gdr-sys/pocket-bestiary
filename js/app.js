/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   APP.JS — Le tre viste (Bestiario, Crea, Mazzo), l'elenco con
   ricerca e filtri, la scheda con la barra delle varianti, le
   impostazioni. Indirizzi: #bestiario, #bestiario/2024:aboleth,
   #crea, #crea/hb:…, #mazzo.
   ============================================================ */

const Pocket = (() => {
  const { esc, gsEtichetta, normal } = T;
  const $ = (s) => document.querySelector(s);

  const stato = { ed: 'tutte', q: '', gsMin: 0, gsMax: 30, tipo: '', sel: null, varianti: {} };
  const TAVOLOZZE = [['muschio', 'oklch(52% .13 132)'], ['brace', 'oklch(62% .17 52)'], ['grafite', 'oklch(45% .015 255)'], ['bosco', 'oklch(50% .12 160)'], ['cuoio', 'oklch(55% .12 70)'], ['inchiostro', 'oklch(48% .14 232)'], ['vino', 'oklch(48% .17 14)'], ['nero', 'oklch(20% 0 0)']];

  // ── Avvisi ──
  let timerAvviso = null;
  const avviso = (testo) => {
    const a = $('#avviso');
    a.textContent = testo; a.hidden = false;
    a.classList.remove('entra'); void a.offsetWidth; a.classList.add('entra');
    clearTimeout(timerAvviso); timerAvviso = setTimeout(() => { a.hidden = true; }, 3200);
  };
  const aggiornaConta = () => { const n = Dati.mazzo.length, c = $('#conta-mazzo'); c.textContent = n; c.hidden = n === 0; };

  // ── Elenco ──
  const filtrati = () => {
    const q = normal(stato.q.trim());
    return Dati.tutti().filter(m => {
      if (stato.ed !== 'tutte' && m._ed !== stato.ed) return false;
      if (m._gs < stato.gsMin || m._gs > stato.gsMax) return false;
      if (stato.tipo && m._tipo !== stato.tipo) return false;
      if (q && !m._cerca.includes(q) && !(q.length > 2 && Dati.testoCompleto(m).includes(q))) return false;
      return true;
    }).sort((a, b) => {
      if (q) { const pa = a._cerca.startsWith(q) ? 0 : a._cerca.includes(q) ? 1 : 2, pb = b._cerca.startsWith(q) ? 0 : b._cerca.includes(q) ? 1 : 2; if (pa !== pb) return pa - pb; }
      return a.nome.localeCompare(b.nome, 'it') || a._ed.localeCompare(b._ed);
    });
  };

  const miniatura = (m) => {
    if (Dati.pref('illustrazioni') === false) return '';
    const i = Immagini.per(m);
    return i ? '<span class="mini-fig' + (i.generica ? ' generica' : '') + (i.propria ? ' propria' : '') + '" aria-hidden="true"><img src="' + esc(i.src) + '" alt="" loading="lazy" decoding="async"></span>' : '<span class="mini-fig" aria-hidden="true"></span>';
  };

  const disegnaElenco = () => {
    const lista = filtrati();
    const ol = $('#lista');
    $('#conta-risultati').textContent = lista.length === 1 ? '1 mostro' : lista.length + ' mostri';
    if (!lista.length) {
      ol.innerHTML = '<li class="lista-vuota">' + (stato.ed === 'homebrew' && !Dati.homebrew.length ? 'Non hai ancora mostri tuoi. Creane uno da <a href="#crea">Crea</a>, oppure apri un mostro e scegli «Salva tra i miei».' : 'Nessun mostro con questi filtri. Prova ad allargare il GS o a cambiare edizione.') + '</li>';
      return;
    }
    ol.classList.toggle('con-fig', Dati.pref('illustrazioni') !== false);
    ol.innerHTML = lista.map(m =>
      '<li><button type="button" data-ref="' + esc(m._ref) + '"' + (m._ref === stato.sel ? ' aria-current="true"' : '') + '>' + miniatura(m) +
      '<span class="n">' + esc(m.nome) + '</span><span class="gs">GS ' + gsEtichetta(m._gs) + '</span>' +
      '<span class="t"><span class="ed' + (m._ed === 'homebrew' ? ' hb' : '') + '">' + (m._ed === 'homebrew' ? 'mio' : m._ed) + '</span>' + esc(m.tipo || '') + '</span></button></li>'
    ).join('');
  };

  const riempiFiltri = () => {
    const opz = GS.LISTA.map(v => '<option value="' + v + '">' + gsEtichetta(v) + '</option>').join('');
    $('#gs-min').innerHTML = opz; $('#gs-max').innerHTML = opz;
    $('#gs-min').value = '0'; $('#gs-max').value = '30';
    const tipi = [...new Set(Dati.tutti().map(m => m._tipo))].sort((a, b) => a.localeCompare(b, 'it'));
    $('#filtro-tipo').innerHTML = '<option value="">Tutti</option>' + tipi.map(t => '<option>' + esc(t === 'Non' ? 'Non morto' : t) + '</option>').join('');
    $('#filtro-tipo').querySelectorAll('option').forEach(o => { if (o.textContent === 'Non morto') o.value = 'Non'; });
  };

  const riepilogo = () => {
    const a = Dati.srd.filter(m => m._ed === '2014').length, b = Dati.srd.filter(m => m._ed === '2024').length, h = Dati.homebrew.length;
    $('#riepilogo').textContent = a + ' mostri 2014, ' + b + ' mostri 2024' + (h ? ', ' + h + (h === 1 ? ' tuo' : ' tuoi') : '');
  };

  // ── Scheda ──
  const mostroCorrente = () => { const base = Dati.trova(stato.sel); return base ? GS.applica(base, stato.varianti[stato.sel] || {}) : null; };

  const barraVariante = (base) => {
    const v = stato.varianti[base._ref] || {};
    const gsDa = base._gs;
    const gsSel = v.gs != null && v.gs !== '' ? Number(v.gs) : gsDa;
    const mod = gsSel !== gsDa || v.nome || v.tipoDanno;
    return '<div class="mini">Grado di Sfida<div class="gs-passi">' +
        '<button type="button" class="tondo" data-gs-passo="-1" aria-label="Abbassa il GS"' + (gsSel <= 0 ? ' disabled' : '') + '>−</button>' +
        '<select class="campo" id="var-gs" aria-label="Grado di Sfida">' + GS.LISTA.map(x => '<option value="' + x + '"' + (x === gsSel ? ' selected' : '') + '>GS ' + gsEtichetta(x) + (x === gsDa ? ' · originale' : '') + '</option>').join('') + '</select>' +
        '<button type="button" class="tondo" data-gs-passo="1" aria-label="Alza il GS"' + (gsSel >= 30 ? ' disabled' : '') + '>+</button></div></div>' +
      '<label class="mini largo">Nuovo nome<input class="campo" id="var-nome" autocomplete="off" placeholder="Vuoto: resta ' + esc(base.nome) + '" value="' + esc(v.nome || '') + '"></label>' +
      '<label class="mini">Tipo di danno<select class="campo" id="var-danno"><option value="">Originale</option>' + GS.TIPI_DANNO.map(t => '<option value="' + t + '"' + (v.tipoDanno === t ? ' selected' : '') + '>' + t.replace(/^da /, '') + '</option>').join('') + '</select></label>' +
      (mod ? '<button type="button" class="btn quieto" id="var-ripristina">Ripristina</button><p class="nota-variante">Variante: CA, PF, attacchi, CD e danni ricalcolati con la tabella della Guida del DM. Le capacità speciali restano come sono: rileggile.</p>' : '');
  };

  const disegnaScheda = () => {
    const base = Dati.trova(stato.sel);
    $('#vuoto-dettaglio').hidden = !!base;
    $('#pannello-scheda').hidden = !base;
    if (!base) return;
    const m = mostroCorrente();
    $('#variante').innerHTML = barraVariante(base);
    const st = Dati.pref('stile');
    $('#palco').innerHTML = Schede.disegna(m, st, Pocket.opzSchede());
    barraCarta(base, st);
    $('#btn-modifica').hidden = base._ed !== 'homebrew';
    $('#btn-salva-hb').textContent = base._ed === 'homebrew' ? 'Duplica' : 'Salva tra i miei';
    $('#menu-altro [data-azione="elimina"]').hidden = base._ed !== 'homebrew';
    $('#menu-altro [data-azione="confronta"]').hidden = !Dati.gemello(base);
    $('#menu-altro [data-azione="togli-immagine"]').hidden = !Immagini.haPropria(base._ref);
    $('#menu-altro [data-azione="immagine"]').textContent = Immagini.haPropria(base._ref) ? 'Cambia la tua immagine' : 'Usa una tua immagine';
    document.title = m.nome + ' · Pocket Bestiary';
  };

  // Regolazioni dell'illustrazione sulla carta (solo nello stile Carta)
  const POSIZIONI = [['fronte', 'Fronte'], ['retro', 'Retro'], ['entrambi', 'Fronte e retro'], ['nessuna', 'Nessuna']];
  const leggiInq = () => { try { return JSON.parse(localStorage.getItem('pb_inq') || '{}'); } catch (e) { return {}; } };
  const scriviInq = (o) => { try { localStorage.setItem('pb_inq', JSON.stringify(o)); } catch (e) {} };
  const segmenti = (nome, lista, val) => lista.map(([v, t]) => '<button type="button" data-' + nome + '="' + v + '" aria-pressed="' + (v === val) + '">' + t + '</button>').join('');
  const barraCarta = (base, st) => {
    const b = $('#barra-carta');
    b.hidden = st !== 'carta';
    if (b.hidden) return;
    const pos = Dati.pref('posizione') || 'fronte', alt = Dati.pref('altezza') || 'media';
    const q = leggiInq()[base._ref] || {};
    const conImg = pos !== 'nessuna';
    b.innerHTML = '<div class="gruppo"><span class="etichetta">Illustrazione</span><div class="segmenti" role="group" aria-label="Dove va l’illustrazione">' + segmenti('pos', POSIZIONI, pos) + '</div></div>' +
      (conImg && pos !== 'retro' ? '<div class="gruppo"><span class="etichetta">Altezza sul fronte</span><div class="segmenti" role="group" aria-label="Altezza dell’illustrazione">' + segmenti('alt', [['bassa', 'Bassa'], ['media', 'Media'], ['alta', 'Alta']], alt) + '</div></div>' : '') +
      (conImg ? '<div class="gruppo"><span class="etichetta">Inquadratura di questo mostro</span><label class="cursore">Su e giù <input type="range" id="inq-y" min="0" max="100" value="' + (q.y ?? 50) + '"></label><label class="cursore">Zoom <input type="range" id="inq-z" min="100" max="300" value="' + Math.round((q.z ?? 1) * 100) + '"></label><button type="button" class="btn quieto piccolo" id="inq-reset"' + (q.y != null || q.z != null ? '' : ' hidden') + '>Centra</button></div>' : '');
  };

  const apriMostro = (ref, { scorri = true } = {}) => {
    stato.sel = ref;
    document.querySelectorAll('#lista button[aria-current]').forEach(b => b.removeAttribute('aria-current'));
    const b = document.querySelector('#lista button[data-ref="' + CSS.escape(ref) + '"]');
    if (b) b.setAttribute('aria-current', 'true');
    disegnaScheda();
    $('#lavoro-bestiario').classList.add('con-scheda');
    if (scorri && matchMedia('(max-width: 880px)').matches) window.scrollTo({ top: 0 });
    history.replaceState(null, '', '#bestiario/' + ref);
  };

  const cambiaVariante = (k, val) => {
    const ref = stato.sel;
    stato.varianti[ref] = { ...(stato.varianti[ref] || {}), [k]: val };
    const v = stato.varianti[ref];
    if (!v.gs && v.gs !== 0 && !v.nome && !v.tipoDanno) delete stato.varianti[ref];
    const att = document.activeElement?.id;
    disegnaScheda();
    if (att) document.getElementById(att)?.focus();
  };

  // ── Viste ──
  const mostraVista = (nome) => {
    document.querySelectorAll('.vista').forEach(v => { v.hidden = v.dataset.vista !== nome; });
    document.querySelectorAll('.voce').forEach(v => { if (v.dataset.vista === nome) v.setAttribute('aria-current', 'page'); else v.removeAttribute('aria-current'); });
  };

  const instrada = () => {
    const [vista, ref] = decodeURIComponent(location.hash.slice(1)).split('/');
    if (vista === 'crea') {
      mostraVista('crea');
      const m = ref ? Dati.trova(ref) : null;
      Editor.apri(m && m._ed === 'homebrew' ? m : null, (salvato) => { riepilogo(); disegnaElenco(); location.hash = '#bestiario/' + salvato._ref; });
      document.title = 'Crea · Pocket Bestiary';
    } else if (vista === 'mazzo') {
      mostraVista('mazzo'); Mazzo.disegna(); document.title = 'Mazzo · Pocket Bestiary';
    } else {
      mostraVista('bestiario');
      if (ref && Dati.trova(ref)) { if (ref !== stato.sel) apriMostro(ref, { scorri: false }); else disegnaScheda(); }
      else document.title = 'Pocket Bestiary';
    }
    window.scrollTo(0, 0);
  };

  // ── Impostazioni ──
  const applicaTema = () => {
    let t = Dati.pref('tema');
    if (t === 'sistema') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    const c = Dati.pref('colore');
    if (c && c !== 'muschio') document.documentElement.dataset.colore = c; else delete document.documentElement.dataset.colore;
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.body).backgroundColor;
    document.querySelectorAll('#temi button').forEach(b => b.setAttribute('aria-pressed', b.dataset.tema === Dati.pref('tema')));
    document.querySelectorAll('#tavolozze button').forEach(b => b.setAttribute('aria-pressed', b.dataset.colore === (c || 'muschio')));
  };

  const scaricaFile = (nome, testo) => {
    const url = URL.createObjectURL(new Blob([testo], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ── Avvio ──
  const collega = () => {
    // elenco
    let t = null;
    $('#cerca').addEventListener('input', (e) => { stato.q = e.target.value; clearTimeout(t); t = setTimeout(disegnaElenco, 90); });
    $('#cerca').addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); $('#lista button')?.focus(); } if (e.key === 'Enter') { const b = $('#lista button'); if (b) apriMostro(b.dataset.ref); } });
    document.querySelector('.filtri').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ed]'); if (!b) return;
      stato.ed = b.dataset.ed;
      document.querySelectorAll('[data-ed]').forEach(x => x.setAttribute('aria-pressed', x === b));
      disegnaElenco();
    });
    $('#gs-min').addEventListener('change', (e) => { stato.gsMin = Number(e.target.value); if (stato.gsMin > stato.gsMax) { stato.gsMax = stato.gsMin; $('#gs-max').value = e.target.value; } disegnaElenco(); });
    $('#gs-max').addEventListener('change', (e) => { stato.gsMax = Number(e.target.value); if (stato.gsMax < stato.gsMin) { stato.gsMin = stato.gsMax; $('#gs-min').value = e.target.value; } disegnaElenco(); });
    $('#filtro-tipo').addEventListener('change', (e) => { stato.tipo = e.target.value; disegnaElenco(); });
    $('#lista').addEventListener('click', (e) => { const b = e.target.closest('button[data-ref]'); if (b) apriMostro(b.dataset.ref); });
    $('#lista').addEventListener('keydown', (e) => {
      const b = e.target.closest('button[data-ref]'); if (!b) return;
      const li = b.parentElement;
      if (e.key === 'ArrowDown') { e.preventDefault(); li.nextElementSibling?.querySelector('button')?.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (li.previousElementSibling?.querySelector('button') || $('#cerca')).focus(); }
    });

    // telefono: torna all'elenco
    $('#torna-elenco').addEventListener('click', () => {
      $('#lavoro-bestiario').classList.remove('con-scheda');
      history.replaceState(null, '', '#bestiario');
      const b = document.querySelector('#lista button[aria-current="true"]');
      if (b) { b.scrollIntoView({ block: 'center' }); b.focus({ preventScroll: true }); }
    });

    // stili
    const st = $('#stili');
    st.innerHTML = '<div class="segmenti" role="group" aria-label="Stile della scheda">' + Schede.STILI.map(s => '<button type="button" data-stile="' + s.id + '" aria-pressed="' + (s.id === Dati.pref('stile')) + '">' + s.nome + '</button>').join('') + '</div><div class="interruttori" role="group" aria-label="Opzioni di visualizzazione">' +
      '<button type="button" data-colonne aria-pressed="' + !!Dati.pref('colonne') + '" title="Testo su due colonne, per i mostri lunghi">2 colonne</button>' +
      '<button type="button" data-illustrazioni aria-pressed="' + (Dati.pref('illustrazioni') !== false) + '">Illustrazioni</button></div>';
    const aggColonne = () => { st.querySelector('[data-colonne]').hidden = !['manuale', 'inchiostro'].includes(Dati.pref('stile')); };
    aggColonne();
    st.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-illustrazioni')) { Dati.pref('illustrazioni', Dati.pref('illustrazioni') === false); b.setAttribute('aria-pressed', Dati.pref('illustrazioni') !== false); disegnaElenco(); }
      else if (b.hasAttribute('data-colonne')) { Dati.pref('colonne', !Dati.pref('colonne')); b.setAttribute('aria-pressed', !!Dati.pref('colonne')); }
      else { Dati.pref('stile', b.dataset.stile); st.querySelectorAll('[data-stile]').forEach(x => x.setAttribute('aria-pressed', x === b)); aggColonne(); }
      disegnaScheda();
    });

    // varianti
    const vr = $('#variante');
    vr.addEventListener('change', (e) => {
      if (e.target.id === 'var-gs') cambiaVariante('gs', e.target.value);
      if (e.target.id === 'var-danno') cambiaVariante('tipoDanno', e.target.value);
      if (e.target.id === 'var-nome') cambiaVariante('nome', e.target.value);
    });
    vr.addEventListener('keydown', (e) => { if (e.target.id === 'var-nome' && e.key === 'Enter') cambiaVariante('nome', e.target.value); });
    vr.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.gsPasso) { const base = Dati.trova(stato.sel); const cur = Number(stato.varianti[stato.sel]?.gs ?? base._gs); cambiaVariante('gs', GS.passo(cur, +b.dataset.gsPasso)); document.querySelector('[data-gs-passo="' + b.dataset.gsPasso + '"]')?.focus(); }
      if (b.id === 'var-ripristina') { delete stato.varianti[stato.sel]; disegnaScheda(); }
    });

    // dadi
    document.addEventListener('click', (e) => {
      const d = e.target.closest('.dado'); if (!d) return;
      const r = T.tira(d.dataset.dado); if (!r) return;
      avviso(d.dataset.dado + ' → ' + r.totale + (r.dadi.length > 1 || r.bonus ? '  (' + r.dadi.join(' + ') + (r.bonus ? (r.bonus > 0 ? ' + ' : ' − ') + Math.abs(r.bonus) : '') + ')' : ''));
    });

    // azioni della scheda
    $('#btn-mazzo').addEventListener('click', () => { Dati.aggiungiMazzo(stato.sel, stato.varianti[stato.sel]); aggiornaConta(); avviso(mostroCorrente().nome + ' è nel mazzo'); });
    $('#btn-salva-hb').addEventListener('click', () => {
      const m = mostroCorrente();
      const copia = { ...m, id: '', formato: m._formato, origine: m.origine || (Dati.trova(stato.sel)._ed !== 'homebrew' ? Dati.trova(stato.sel).id : undefined), nome: Dati.trova(stato.sel)._ed === 'homebrew' && !stato.varianti[stato.sel]?.nome ? m.nome + ' (copia)' : m.nome };
      delete copia._variante;
      const s = Dati.salvaHB(copia);
      if (!s) { avviso('Non riesco a salvare: lo spazio del browser è pieno.'); return; }
      riepilogo(); disegnaElenco(); avviso('Salvato tra i tuoi: ' + s.nome); apriMostro(s._ref, { scorri: false });
    });
    $('#btn-modifica').addEventListener('click', () => { location.hash = '#crea/' + stato.sel; });
    const menu = $('#menu-altro'), altro = $('#btn-altro');
    const chiudiMenu = () => { menu.hidden = true; altro.setAttribute('aria-expanded', 'false'); };
    altro.addEventListener('click', (e) => { e.stopPropagation(); const ap = menu.hidden; menu.hidden = !ap; altro.setAttribute('aria-expanded', String(ap)); if (ap) menu.querySelector('button:not([hidden])')?.focus(); });
    document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('#menu-altro')) chiudiMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); altro.focus(); } });
    menu.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-azione]'); if (!b) return;
      const az = b.dataset.azione;
      if (az === 'elimina' && !b.dataset.conferma) { b.dataset.conferma = '1'; b.textContent = 'Tocca ancora per eliminare'; return; }
      chiudiMenu();
      const m = mostroCorrente();
      if (az === 'immagine') { $('#file-immagine').click(); return; }
      if (az === 'togli-immagine') { await Immagini.togli(stato.sel); disegnaElenco(); disegnaScheda(); avviso('Torna l’illustrazione dell’app'); return; }
      if (az === 'stampa') { if (Dati.pref('stile') === 'carta') { Dati.aggiungiMazzo(stato.sel, stato.varianti[stato.sel]); aggiornaConta(); Mazzo.stampa(); } else window.print(); }
      if (az === 'testo') {
        const txt = Schede.testoSemplice(m);
        try { await navigator.clipboard.writeText(txt); avviso('Scheda copiata come testo'); } catch (err) { avviso('Il browser non ha permesso la copia'); }
      }
      if (az === 'confronta') {
        const base = Dati.trova(stato.sel), altra = Dati.gemello(base);
        const [a, c] = base._ed === '2014' ? [base, altra] : [altra, base];
        $('#confronto-griglia').innerHTML = [a, c].map(x => '<div>' + Schede.disegna(x, Dati.pref('stile') === 'carta' ? 'manuale' : Dati.pref('stile'), {}) + '</div>').join('');
        $('#titolo-confronto').textContent = a.nome + ': 2014 e 2024';
        $('#confronto').showModal();
      }
      if (az === 'elimina') {
        const nome = m.nome;
        Dati.eliminaHB(stato.sel); stato.sel = null; aggiornaConta(); riepilogo(); disegnaElenco(); disegnaScheda();
        history.replaceState(null, '', '#bestiario'); avviso(nome + ' eliminato');
        b.textContent = 'Elimina dai miei'; delete b.dataset.conferma;
      }
    });

    // regolazioni della carta
    const bc = $('#barra-carta');
    bc.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pos) { Dati.pref('posizione', b.dataset.pos); disegnaScheda(); }
      else if (b.dataset.alt) { Dati.pref('altezza', b.dataset.alt); disegnaScheda(); }
      else if (b.id === 'inq-reset') { const o = leggiInq(); delete o[stato.sel]; scriviInq(o); disegnaScheda(); }
    });
    bc.addEventListener('input', (e) => {
      if (e.target.id !== 'inq-y' && e.target.id !== 'inq-z') return;
      const o = leggiInq(); const q = o[stato.sel] || {};
      if (e.target.id === 'inq-y') q.y = +e.target.value; else q.z = +e.target.value / 100;
      o[stato.sel] = q; scriviInq(o);
      // aggiorna subito le immagini, senza ridisegnare: il cursore resta sotto il dito
      document.querySelectorAll('#palco .c-fig img, #palco .rt-fig img').forEach(img => {
        img.style.objectPosition = '50% ' + (q.y ?? 50) + '%';
        if (img.closest('.c-fig')) { img.style.transform = 'scale(' + (q.z ?? 1) + ')'; img.style.transformOrigin = '50% ' + (q.y ?? 50) + '%'; }
      });
      const r = bc.querySelector('#inq-reset'); if (r) r.hidden = false;
    });
    bc.addEventListener('change', (e) => { if (e.target.id === 'inq-y' || e.target.id === 'inq-z') disegnaScheda(); });

    // illustrazione in grande
    const lente = $('#lente');
    const apriLente = (el) => { $('#lente-img').src = el.dataset.ingrandisci; $('#lente-nome').textContent = el.dataset.nome || ''; lente.classList.toggle('propria', el.classList.contains('propria')); lente.showModal(); };
    document.addEventListener('click', (e) => { const f = e.target.closest('[data-ingrandisci]'); if (f) apriLente(f); });
    document.addEventListener('keydown', (e) => { const f = e.target.closest && e.target.closest('[data-ingrandisci]'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); apriLente(f); } });
    lente.addEventListener('click', (e) => { if (e.target === lente || e.target.closest('.tavola')) lente.close(); });

    // immagine propria
    $('#file-immagine').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f || !stato.sel) return;
      if (f.size > 15e6) { avviso('L’immagine è troppo grande: scegline una sotto i 15 MB'); return; }
      try { await Immagini.imposta(stato.sel, f); disegnaElenco(); disegnaScheda(); avviso('Immagine aggiornata: la vedi anche sulle carte'); }
      catch (err) { avviso('Non riesco a leggere questa immagine. Prova con un JPG, PNG o WebP.'); }
    });

    // account
    const contoInfo = (i) => {
      const b = $('#apri-account');
      b.dataset.stato = i.dentro ? i.stato : '';
      const img = b.querySelector('img'); if (i.foto) { img.src = i.foto; img.hidden = false; } else img.hidden = true;
      b.setAttribute('aria-label', i.dentro ? 'Account: ' + i.email : 'Accedi per salvare i tuoi mostri ovunque');
      $('#conto-fuori').hidden = i.dentro; $('#conto-dentro').hidden = !i.dentro;
      if (i.dentro) {
        $('#conto-chi').textContent = i.nome ? i.nome + ' · ' + i.email : i.email;
        const ora = i.ultima ? ' alle ' + new Date(i.ultima).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
        $('#conto-stato').textContent = { sincronizzo: 'Sto sincronizzando…', ok: 'Tutto salvato online' + ora + '.', offline: 'Sei offline: salvo qui e sincronizzo appena torni online.', errore: Account.errore() || 'La sincronizzazione non è riuscita.' }[i.stato] || '';
      }
    };
    Account.ascolta(contoInfo);
    document.addEventListener('pb:sincronizzato', () => { riepilogo(); disegnaElenco(); aggiornaConta(); });
    const erroreConto = (e) => { const p = $('#conto-errore'); p.textContent = Account.messaggio(e); p.hidden = false; };
    const conto = async (fn) => { $('#conto-errore').hidden = true; try { await fn(); } catch (e) { erroreConto(e); } };
    $('#apri-account').addEventListener('click', () => { applicaTema(); $('#impostazioni').showModal(); Account.caricaFirebase().catch(() => {}); });
    $('#conto-google').addEventListener('click', () => conto(() => Account.conGoogle()));
    $('#conto-entra').addEventListener('click', () => conto(() => Account.conEmail($('#conto-mail').value.trim(), $('#conto-pw').value, false)));
    $('#conto-crea').addEventListener('click', () => conto(() => Account.conEmail($('#conto-mail').value.trim(), $('#conto-pw').value, true)));
    $('#conto-recupera').addEventListener('click', () => conto(async () => { const m = $('#conto-mail').value.trim(); if (!m) throw { code: 'auth/invalid-email' }; await Account.recupera(m); avviso('Ti ho mandato un’email per scegliere una nuova password'); }));
    $('#conto-esci').addEventListener('click', () => conto(() => Account.esci()));
    $('#conto-sync').addEventListener('click', () => conto(() => Account.sincronizza()));

    // impostazioni
    $('#apri-impostazioni').addEventListener('click', () => { applicaTema(); $('#impostazioni').showModal(); });
    $('#temi').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if (!b) return; Dati.pref('tema', b.dataset.tema); applicaTema(); });
    $('#tavolozze').innerHTML = TAVOLOZZE.map(([id, col]) => '<button type="button" data-colore="' + id + '" style="background:' + col + '" aria-label="Tavolozza ' + id + '" title="' + id + '"></button>').join('');
    $('#tavolozze').addEventListener('click', (e) => { const b = e.target.closest('[data-colore]'); if (!b) return; Dati.pref('colore', b.dataset.colore); applicaTema(); });
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (Dati.pref('tema') === 'sistema') applicaTema(); });
    $('#esporta').addEventListener('click', () => {
      if (!Dati.homebrew.length) { avviso('Non hai ancora mostri tuoi da salvare'); return; }
      scaricaFile('pocket-bestiary-mostri.json', Dati.esportaHB()); avviso(Dati.homebrew.length + (Dati.homebrew.length === 1 ? ' mostro salvato nel file' : ' mostri salvati nel file'));
    });
    $('#importa').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const n = Dati.importaHB(await f.text()); riepilogo(); riempiFiltri(); disegnaElenco(); avviso(n ? n + (n === 1 ? ' mostro caricato' : ' mostri caricati') : 'Nel file non ho trovato mostri'); }
      catch (err) { avviso('Il file non è un salvataggio di Pocket Bestiary'); }
      e.target.value = '';
    });

    window.addEventListener('hashchange', instrada);
    Mazzo.collega();
  };

  const avvia = async () => {
    collega();
    applicaTema();
    aggiornaConta();
    try {
      await Promise.all([Dati.carica(), Immagini.carica()]);
    } catch (e) {
      $('#riepilogo').textContent = 'Non riesco a caricare i mostri. Se hai aperto il file direttamente dal computer, avvia l\'app da un server (vedi LEGGIMI).';
      return;
    }
    Account.avvia();
    riempiFiltri();
    riepilogo();
    disegnaElenco();
    if (!location.hash) history.replaceState(null, '', '#bestiario');
    instrada();
    if (!stato.sel && matchMedia('(min-width: 881px)').matches && (location.hash === '#bestiario' || location.hash === '')) {
      const primo = Dati.trova('2024:drago_rosso_giovane') || Dati.trova('2024:aboleth');
      if (primo) apriMostro(primo._ref, { scorri: false });
    }
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  };

  document.addEventListener('DOMContentLoaded', avvia);
  return { avviso, aggiornaConta, opzSchede: () => ({ colonne: Dati.pref('colonne'), formato: Dati.pref('formato'), coloreTipo: Dati.pref('coloreTipo'), illustrazioni: Dati.pref('illustrazioni') !== false, immagine: (Dati.pref('posizione') || 'fronte') !== 'nessuna', posizione: Dati.pref('posizione') || 'fronte', altezza: Dati.pref('altezza') || 'media' }) };
})();
