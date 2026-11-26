/* Pocket Bestiary — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   TESTI.JS — Piccoli attrezzi condivisi: escape, testo con
   *corsivo*, nomi italiani di caratteristiche e abilità, segni
   dei modificatori, tiro dei dadi.
   ============================================================ */

const T = (() => {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // *corsivo* e **grassetto** come nei dati SRD; a capo → paragrafo
  const inline = (s, { dadi = false } = {}) => {
    let h = esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    if (dadi) h = h.replace(/\b(\d+d\d+(?:\s*[+\-−]\s*\d+)?)/g, '<button type="button" class="dado" data-dado="$1">$1</button>');
    return h;
  };
  const paragrafi = (s, opz) => String(s ?? '').split(/\n{2,}|\n/).filter(x => x.trim()).map(x => inline(x, opz));

  const CAR = [
    ['forza', 'FOR', 'Forza'], ['destrezza', 'DES', 'Destrezza'], ['costituzione', 'COS', 'Costituzione'],
    ['intelligenza', 'INT', 'Intelligenza'], ['saggezza', 'SAG', 'Saggezza'], ['carisma', 'CAR', 'Carisma'],
  ];
  const ABILITA = {
    acrobazia: ['Acrobazia', 'destrezza'], addestrare_animali: ['Addestrare animali', 'saggezza'], arcano: ['Arcano', 'intelligenza'],
    atletica: ['Atletica', 'forza'], furtivita: ['Furtività', 'destrezza'], indagare: ['Indagare', 'intelligenza'],
    inganno: ['Inganno', 'carisma'], intimidire: ['Intimidire', 'carisma'], intrattenere: ['Intrattenere', 'carisma'],
    intuizione: ['Intuizione', 'saggezza'], medicina: ['Medicina', 'saggezza'], natura: ['Natura', 'intelligenza'],
    percezione: ['Percezione', 'saggezza'], persuasione: ['Persuasione', 'carisma'], rapidita_di_mano: ['Rapidità di mano', 'destrezza'],
    religione: ['Religione', 'intelligenza'], sopravvivenza: ['Sopravvivenza', 'saggezza'], storia: ['Storia', 'intelligenza'],
    mano: ['Rapidità di mano', 'destrezza'], furto: ['Rapidità di mano', 'destrezza'],
  };
  const nomeAbilita = (k) => (ABILITA[k] ? ABILITA[k][0] : k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()));

  const VELOCITA = { camminata: '', volo: 'volare', nuoto: 'nuotare', scalata: 'scalare', scavare: 'scavare' };
  const SENSI = { vista_cieca: 'vista cieca', scurovisione: 'scurovisione', percezione_tellurica: 'percezione tellurica', vista_pura: 'vista pura' };

  const segno = (n) => (n >= 0 ? '+' : '−') + Math.abs(n);
  const mod = (punteggio) => Math.floor((Number(punteggio || 10) - 10) / 2);
  const num = (n) => String(Math.round(Number(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const gsEtichetta = (v) => v === 0.125 ? '1/8' : v === 0.25 ? '1/4' : v === 0.5 ? '1/2' : String(v ?? '—');
  const maiuscola = (s) => String(s || '').replace(/^./, c => c.toUpperCase());

  // Tiro di una formula "2d6 + 3"
  const tira = (formula) => {
    const m = String(formula).replace(/−/g, '-').match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/);
    if (!m) return null;
    const n = +m[1], f = +m[2], b = m[4] ? (m[3] === '-' ? -1 : 1) * +m[4] : 0;
    const dadi = Array.from({ length: Math.min(n, 100) }, () => 1 + Math.floor(Math.random() * f));
    return { totale: dadi.reduce((a, x) => a + x, 0) + b, dadi, bonus: b };
  };

  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  return { esc, inline, paragrafi, CAR, ABILITA, nomeAbilita, VELOCITA, SENSI, segno, mod, num, gsEtichetta, maiuscola, tira, id, normal };
})();
