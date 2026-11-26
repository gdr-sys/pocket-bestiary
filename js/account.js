/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   ACCOUNT.JS — Accesso facoltativo, come in Compendio Arcano.
   Senza accesso tutto resta nel browser. Con l'accesso (Google o
   email) i mostri homebrew, il mazzo, le inquadrature e le
   preferenze si salvano anche online e si ritrovano ovunque.
   Firebase si scarica solo quando serve (accesso già fatto o
   pannello aperto), così l'app resta veloce e funziona offline.

   Dati online (stesso progetto Firebase di Compendio Arcano,
   stesso account per tutte le app della famiglia):
     utenti/{uid}/bestiario/{id}        { j: JSON del mostro, agg }  oppure  { del: true, agg }
     utenti/{uid}/bestiario_dati/stato  { j: JSON di mazzo, preferenze e inquadrature, agg }
   Le immagini caricate dall'utente viaggiano dentro il mostro
   (data URL) solo per i mostri homebrew, entro il limite di 1 MB.
   ============================================================ */

const Account = (() => {
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyD04-DAqpG2Lxs--C41fn9mo1y1BpGpipA',
    authDomain: 'compendio-arcano-431f9.firebaseapp.com',
    projectId: 'compendio-arcano-431f9',
    storageBucket: 'compendio-arcano-431f9.firebasestorage.app',
    messagingSenderId: '246199575136',
    appId: '1:246199575136:web:f9daa814bf919f040b5905',
  };
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.0/';
  const K_ACCESSO = 'pb_account';
  const MAX_DOC = 950000;

  let fb = null, caricamento = null, utente = null;
  let stato = 'fuori';          // fuori | sincronizzo | ok | offline | errore
  let ultima = 0, applico = false, timer = null;
  const ascoltatori = [];

  const leggi = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const scrivi = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const docId = (id) => encodeURIComponent(String(id)).replace(/\./g, '%2E');

  const MESSAGGI = {
    'auth/invalid-credential': 'Email o password non corrette.',
    'auth/wrong-password': 'Email o password non corrette.',
    'auth/user-not-found': 'Non c’è un account con questa email.',
    'auth/invalid-email': 'L’indirizzo email non è valido.',
    'auth/email-already-in-use': 'Esiste già un account con questa email: usa «Accedi».',
    'auth/weak-password': 'La password deve avere almeno 6 caratteri.',
    'auth/missing-password': 'Scrivi la password.',
    'auth/too-many-requests': 'Troppi tentativi: riprova tra qualche minuto.',
    'auth/network-request-failed': 'Nessuna connessione: riprova quando sei online.',
    'auth/unauthorized-domain': 'Questo indirizzo non è ancora autorizzato all’accesso.',
    'auth/popup-closed-by-user': 'Hai chiuso la finestra di Google prima di finire.',
    'auth/account-exists-with-different-credential': 'Questa email è registrata con un altro metodo di accesso.',
    'permission-denied': 'Il server non permette ancora di salvare i mostri: vanno aggiornate le regole di Firebase.',
    'unavailable': 'Nessuna connessione: riprova quando sei online.',
  };
  const messaggio = (err) => MESSAGGI[err && err.code] || 'Qualcosa non ha funzionato' + (err && err.code ? ' (' + err.code + ')' : '') + '.';

  const script = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('Firebase non raggiungibile')); document.head.appendChild(s); });
  const caricaFirebase = () => {
    if (fb) return Promise.resolve(fb);
    if (!caricamento) caricamento = (async () => {
      await script(SDK + 'firebase-app-compat.js');
      await Promise.all([script(SDK + 'firebase-auth-compat.js'), script(SDK + 'firebase-firestore-compat.js')]);
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
      fb = { auth: app.auth(), db: app.firestore(), FieldValue: firebase.firestore.FieldValue, GoogleAuthProvider: firebase.auth.GoogleAuthProvider };
      fb.auth.languageCode = 'it';
      fb.auth.onAuthStateChanged(async (u) => {
        utente = u;
        if (u) { scrivi(K_ACCESSO, '1'); await sincronizza(); }
        else { scrivi(K_ACCESSO, null); imposta('fuori'); }
        avvisa();
      });
      fb.auth.getRedirectResult().catch(() => {});
      return fb;
    })().catch(e => { caricamento = null; throw e; });
    return caricamento;
  };

  const imposta = (s) => { stato = s; if (s === 'ok') ultima = Date.now(); avvisa(); };
  const avvisa = () => ascoltatori.forEach(f => { try { f(info()); } catch (e) {} });
  const info = () => ({ stato, ultima, email: utente?.email || '', nome: utente?.displayName || '', foto: utente?.photoURL || '', dentro: !!utente });

  // ── Cosa si sincronizza ──
  const statoLocale = () => ({
    mazzo: Dati.mazzo,
    prefs: (() => { try { return JSON.parse(leggi('pb_prefs') || '{}'); } catch (e) { return {}; } })(),
    inq: (() => { try { return JSON.parse(leggi('pb_inq') || '{}'); } catch (e) { return {}; } })(),
  });
  const conImmagine = async (m) => {
    const c = JSON.parse(JSON.stringify(m));
    Object.keys(c).forEach(k => { if (k.startsWith('_')) delete c[k]; });
    if (typeof Immagini !== 'undefined' && Immagini.haPropria('hb:' + m.id)) {
      const d = await Immagini.comeDataURL('hb:' + m.id);
      if (d && d.length < 700000) c.immagine_dati = d;
    }
    return c;
  };

  const sincronizza = async () => {
    if (!utente) return;
    imposta('sincronizzo');
    try {
      const base = fb.db.collection('utenti').doc(utente.uid);
      // 1. mostri: vince la versione modificata più di recente
      const snap = await base.collection('bestiario').get();
      const remoti = new Map();
      snap.forEach(d => remoti.set(d.id, d.data()));
      applico = true;
      for (const [id, r] of remoti) {
        const locale = Dati.homebrew.find(m => docId(m.id) === id);
        const tR = r.agg?.toMillis?.() || 0;
        const tL = locale ? Date.parse(locale.aggiornato || 0) || 0 : 0;
        if (r.del) { if (locale && tR > tL) Dati.eliminaHB(locale._ref); continue; }
        if (!locale || tR > tL + 1000) {
          const m = JSON.parse(r.j);
          const img = m.immagine_dati; delete m.immagine_dati;
          m.aggiornato = new Date(tR || Date.now()).toISOString();
          Dati.salvaHB(m, { daRemoto: true });
          if (img && typeof Immagini !== 'undefined') await Immagini.daDataURL('hb:' + m.id, img).catch(() => {});
        }
      }
      applico = false;
      for (const m of Dati.homebrew) {
        const r = remoti.get(docId(m.id));
        const tL = Date.parse(m.aggiornato || 0) || 0;
        if (!r || (!r.del && tL > (r.agg?.toMillis?.() || 0) + 1000)) await scriviMostro(m);
      }
      // 2. mazzo, preferenze e inquadrature: unione semplice, il remoto riempie ciò che manca
      const dati = await base.collection('bestiario_dati').doc('stato').get();
      if (dati.exists) {
        const r = JSON.parse(dati.data().j || '{}');
        applico = true;
        if (!Dati.mazzo.length && r.mazzo?.length) r.mazzo.forEach(v => Dati.aggiungiMazzo(v.ref, v.varianti));
        if (r.inq) { const l = statoLocale().inq; scrivi('pb_inq', JSON.stringify({ ...r.inq, ...l })); }
        applico = false;
      }
      await scriviStato();
      imposta('ok');
      document.dispatchEvent(new CustomEvent('pb:sincronizzato'));
    } catch (e) {
      applico = false;
      erroreUltimo = messaggio(e);
      imposta(e && (e.code === 'unavailable' || !navigator.onLine) ? 'offline' : 'errore');
    }
  };
  let erroreUltimo = '';

  const scriviMostro = async (m) => {
    const c = await conImmagine(m);
    let j = JSON.stringify(c);
    if (j.length > MAX_DOC) { delete c.immagine_dati; j = JSON.stringify(c); }
    await fb.db.collection('utenti').doc(utente.uid).collection('bestiario').doc(docId(m.id)).set({ j, agg: fb.FieldValue.serverTimestamp() });
  };
  const scriviStato = async () => {
    const j = JSON.stringify(statoLocale());
    if (j.length > MAX_DOC) return;
    await fb.db.collection('utenti').doc(utente.uid).collection('bestiario_dati').doc('stato').set({ j, agg: fb.FieldValue.serverTimestamp() });
  };

  // Chiamato da Dati quando qualcosa cambia sul dispositivo
  const cambiato = (tipo, dato) => {
    if (!utente || applico) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        imposta('sincronizzo');
        if (tipo === 'mostro') await scriviMostro(dato);
        else if (tipo === 'elimina') await fb.db.collection('utenti').doc(utente.uid).collection('bestiario').doc(docId(dato)).set({ del: true, agg: fb.FieldValue.serverTimestamp() });
        else await scriviStato();
        imposta('ok');
      } catch (e) { erroreUltimo = messaggio(e); imposta(navigator.onLine ? 'errore' : 'offline'); }
    }, tipo === 'stato' ? 1500 : 300);
  };

  // ── Azioni ──
  const conGoogle = async () => {
    await caricaFirebase();
    const p = new fb.GoogleAuthProvider();
    try { await fb.auth.signInWithPopup(p); }
    catch (e) { if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return fb.auth.signInWithRedirect(p); throw e; }
  };
  const conEmail = async (email, pw, nuovo) => { await caricaFirebase(); return nuovo ? fb.auth.createUserWithEmailAndPassword(email, pw) : fb.auth.signInWithEmailAndPassword(email, pw); };
  const recupera = async (email) => { await caricaFirebase(); return fb.auth.sendPasswordResetEmail(email); };
  const esci = async () => { if (fb) await fb.auth.signOut(); };

  const avvia = () => { if (leggi(K_ACCESSO) === '1' && navigator.onLine !== false) caricaFirebase().catch(() => imposta('offline')); };
  window.addEventListener('online', () => { if (utente) sincronizza(); });

  return { avvia, caricaFirebase, conGoogle, conEmail, recupera, esci, sincronizza, cambiato, messaggio, info, errore: () => erroreUltimo, ascolta: (f) => { ascoltatori.push(f); f(info()); } };
})();
