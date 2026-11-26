# Design System: Pocket Bestiary

Il sistema è quello di Pocket GM Screen (`../dm-toolkit/DESIGN.md`): **"La locandina della campagna"**. In cima a ogni vista una scena bassa con il titolo in Gloock; sotto, tessere tonde e piatte. Qui si annotano solo le differenze.

## Cosa resta uguale

- Titoli in Gloock 400, testo in Figtree. Niente maiuscoletto e niente lettere spaziate nell'interfaccia.
- Tessere senza bordi né ombre (`--tessera`, raggio 20px), campi con un solo filo (`--filo`), pulsanti a pillola.
- Un solo pulsante d'accento per zona (Stampa le carte, Salva tra i miei).
- Tutti i colori nascono da tre numeri (`--h`, `--ha`, `--k`, più `--ca`) in `css/app.css`. Notte e giorno.
- Scena in cima a ogni vista (200-240px): illustrazione in bianco e nero di Pocket GM Screen tinta con la tavolozza (mix-blend luminosity), con una sfumatura verso il fondo a sinistra e in basso per il titolo. Bestiario: il libro con le creature (bestiario.webp); Crea: lo scrittoio (crea.webp); Mazzo: il tavolo con le carte (mazzo.webp). Se un'immagine manca resta il paesaggio disegnato in SVG. Nuove immagini: 21:9, soggetto a destra, webp sotto i 400 KB.

## Cosa cambia

- **Tavolozza predefinita: muschio** (`--h: 95; --ha: 132; --ca: .13`), il verde del marchio. Restano disponibili brace, grafite, bosco, cuoio, inchiostro, vino, nero.
- **Le schede sono oggetti stampati, non interfaccia.** Lo stile Manuale e le Carte hanno colori propri (carta `#f4ead2`, inchiostro `#241b12`, rosso `#7a2016`; cornice delle carte `oklch(42% .11 tinta-del-tipo)`) e restano uguali di notte e di giorno. Lo stile Pocket invece segue la tavolozza.
- **Terza voce tipografica, solo dentro le schede:** Alegreya (nomi in maiuscoletto nel Manuale 2014, titoli di sezione) e Alegreya Sans (testo delle schede e delle carte). Mai nell'interfaccia.
- **Manuale 2014 e 2024 si distinguono:** 2014 ha filetti a cuneo, caratteristiche in riga "21 (+5)", titoli di sezione in maiuscoletto; 2024 ha filetti sottili, la tabella MOD/TS con fisiche e mentali su fondi diversi, Iniziativa accanto alla CA.
- **Carte:** 63×88 mm o 95×133 mm, unità in mm anche a schermo (ingrandite con `zoom`). Colore della cornice per tipo di creatura (tabella `TINTE` in `js/schede.js`), disattivabile.

## Regola delle carte

Il testo si rimpicciolisce a passi (100% → 72%); se non basta, la carta si divide a scala 82% e una voce lunga si spezza tra due frasi, con «continua · 2 di 3» nella testata. La misura avviene nel DOM con lo stesso CSS della stampa, quindi lo schermo e il foglio coincidono.

## Illustrazioni dei mostri

Incisioni originali a inchiostro e grafite su carta chiara, generate con Gemini con un prompt unico (vedi sotto) e salvate in bianco e nero, 768 px, WebP. Nell'app la carta dell'immagine sparisce con `mix-blend-mode: multiply` (dopo `brightness(1.14) contrast(1.25)` per portare il fondo al bianco): resta solo il tratto, sulla pergamena come sulla tessera. Sul nero (social) si inverte e si usa `screen`.

Prompt: «Genera un'immagine: <soggetto>. Illustrazione originale in bianco e nero, stile incisione a inchiostro e grafite da bestiario medievale fantasy, soggetto intero e centrato, visto di tre quarti. Sfondo carta chiaro uniforme e vuoto, nessun testo, nessuna cornice, nessuna firma. Formato quadrato. Tratteggio fine, molto contrasto.»

- **Scheda:** in alto (Manuale, Inchiostro) o nella tessera accanto al nome (Pocket). Al passaggio si ingrandisce, al clic si apre in grande su un foglio di pergamena.
- **Carta:** di base la creatura è intera (`object-fit: contain`), altezza media 26% della carta; se il testo non entra scende al 18% prima di dividere la carta. L'utente sceglie fronte, retro, entrambi o nessuna, l'altezza, e per ogni mostro inquadratura e zoom.
- **Mai immagini ufficiali** di Wizards of the Coast: non sono nell'SRD.
