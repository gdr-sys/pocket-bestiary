<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/logo-orizzontale-scuro.svg">
  <img src="brand/logo-orizzontale-chiaro.svg" alt="Pocket Bestiary" width="330" height="60">
</picture>

# Pocket Bestiary

**Tutti i mostri, in tasca.** Le schede dei mostri di D&D 5e, edizioni 2014 e 2024, da sfogliare, trasformare e stampare. Fa parte della famiglia di [Pocket GM Screen](https://pocketgmscreen.pages.dev/) e Pocket Grimoire.

## Cosa fa

| Area | Cosa offre |
|---|---|
| Bestiario | 320 mostri SRD 5.1 (2014) e 333 SRD 5.2.1 (2024), ricerca per nome e nel testo, filtri per edizione, GS e tipo |
| Stili della scheda | **Manuale** (pergamena, impaginata come il manuale della sua edizione), **Pocket** (le tessere dell'app), **Inchiostro** (bianco e nero da stampare), **Carta** (carta da gioco). Testo su due colonne per i mostri lunghi |
| Cambio del GS | Da GS 0 a 30 con i pulsanti − e +: CA, PF, attacchi, CD, danni, tiri salvezza e abilità ricalcolati con la tabella della Guida del DM. Anche nuovo nome e nuovo tipo di danno |
| Homebrew | Editor con anteprima dal vivo: modificatori, PF dai dadi vita, competenze, Percezione passiva, PE e bonus di competenza calcolati da soli. Aiuto per scrivere gli attacchi nel formato 2014 o 2024. Stima del GS (difesa, attacco, media) |
| Illustrazioni | Un'incisione originale in bianco e nero per i mostri più noti e per ogni tipo di creatura (generate con Gemini per l'app, nessuna immagine ufficiale). Si ingrandiscono al passaggio del mouse e si aprono in grande con un clic. Ognuno può caricare la propria immagine per qualsiasi mostro |
| Mazzo | Cinque formati: Mini 44×63 (16 per A4), Poker 63×88 (9), Tarocchi 70×120 (4), Grande 95×133 (4), Scheda A5 148×210 (1). Illustrazione sul fronte, sul retro, su entrambi o nessuna; altezza e inquadratura regolabili per ogni mostro. Cornice colorata per tipo, segni di taglio, retro specchiato per il fronte-retro. Il testo lungo si rimpicciolisce e, se serve, continua su altre carte spezzandosi tra due frasi |
| Account | Facoltativo, lo stesso di Pocket Grimoire (Google o email): mostri homebrew con le loro immagini, mazzo, preferenze e inquadrature si ritrovano su ogni dispositivo |
| Al tavolo | Ogni formula di dadi nella scheda si tira con un tocco. Confronto 2014/2024 dello stesso mostro. Copia della scheda come testo |
| Dati | Tutto resta sul dispositivo (localStorage). I mostri homebrew si salvano e si ricaricano da un file JSON |
| App installabile | Funziona anche senza internet dopo la prima apertura |

## Avviarla

È un sito statico, senza build. Serve un server qualsiasi, perché i dati si caricano con `fetch`:

```
npx http-server -c-1 .
```

poi apri `http://localhost:8080`. Si pubblica così com'è su GitHub Pages, Cloudflare Pages o Netlify. A ogni rilascio cambia `VERSIONE` in `sw.js`.

Prima di pubblicare:

- pubblicata su Cloudflare Pages (https://pocket-bestiary.pages.dev), collegata a questo repository: ogni invio su `main` aggiorna il sito; il dominio è autorizzato in Firebase. Un dominio nuovo va aggiunto in Firebase > Authentication > Impostazioni > Domini autorizzati;
- metti l'indirizzo completo nelle meta `og:image` e `twitter:image` di `index.html` (i social vogliono l'URL assoluto);
- dopo aver aggiunto illustrazioni in `img/mostri/`, lancia `node scripts/indice-immagini.js`.

Le regole del database sono in `firestore.rules` (pubblicate il 2026-11-26 nel progetto `compendio-arcano-431f9`, insieme a quelle di Pocket Grimoire).

## Struttura

```
index.html            le tre viste e le impostazioni
css/app.css           sistema di Pocket GM Screen: tavolozze, tessere, campi
css/schede.css        le vesti della scheda e delle carte
js/testi.js           escape, nomi italiani, dadi
js/gs.js              cambio del Grado di Sfida e stima del GS (da Pocket GM Screen)
js/dati.js            mostri SRD e homebrew, mazzo, preferenze
js/schede.js          disegno delle schede e delle carte (misura e divisione del testo)
js/editor.js          editor homebrew
js/mazzo.js           mazzo e stampa su A4
js/app.js             elenco, filtri, varianti, indirizzi (#bestiario/2024:aboleth)
data/                 SRD 5.1 e 5.2.1 in italiano (gli stessi file di Pocket GM Screen)
img/scene/            illustrazioni delle scene, da Pocket GM Screen (bianco e nero, tinte dalla tavolozza)
img/mostri/           illustrazioni dei mostri (<id>.webp, tipo-<tipo>.webp) e indice.json
js/immagini.js        quale illustrazione usare; immagini proprie in IndexedDB
js/account.js         accesso e sincronizzazione (Firebase, caricato solo quando serve)
brand/social/         immagini per i social, generate da genera.html (in lavorazione)
scripts/              indice-immagini.js
brand/                logo, simbolo, icone (vedi brand/LEGGIMI.md)
```

## Licenza

© 2026 Noemi Marcolini, tutti i diritti riservati (vedi [LICENSE](LICENSE)). I dati dei mostri vengono dal System Reference Document 5.1 (OGL 1.0a e CC-BY-4.0) e 5.2.1 (CC-BY-4.0) di Wizards of the Coast LLC. Pocket Bestiary è un progetto indipendente, non affiliato a Wizards of the Coast.
