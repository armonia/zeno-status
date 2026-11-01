# Pagina di stato di Zeno: ricerca e scelte (1 nov 2026)

## Cosa ho guardato
Visti direttamente (struttura e pattern): **status.claude.com** (la reference chiesta), **vercel-status.com**, **githubstatus.com**, **cloudflarestatus.com** (tutte Atlassian Statuspage), linearstatus.com (non leggibile senza browser completo, solo riferimento visivo noto). Repo open source vivi (stelle e ultimo push al 1 nov 2026): Upptime 17,2k★ (MIT, push oggi), Uptime Kuma 93k★ (MIT), Gatus 12,5k★ (Apache-2.0, push 29 ott), OpenStatus 9,2k★ (AGPL), cState 2,9k★ (MIT, Hugo, statica).

## Pattern comuni alle migliori
1. **Banner di stato globale** in alto, una frase sola, colore = stato.
2. **Un blocco per servizio** con nome, pillola di stato e **barra a 90 giorni**, una cella per giorno, con **tooltip** (data, minuti di disservizio) e scala "90 giorni fa ... Oggi".
3. **Percentuale di disponibilità** a 90 giorni accanto alla barra.
4. **Disservizi passati raggruppati per giorno**, anche i giorni vuoti ("nessun disservizio segnalato"): dà fiducia.
5. **Iscrizione agli aggiornamenti**: bottone nero in alto a destra (Claude, Vercel, GitHub); tutte offrono RSS/Atom.
6. **Manutenzioni programmate** in sezione propria.
7. Logo del prodotto in alto a sinistra, pagina molto leggera, mobile prima di tutto.

## Scelte
- **Pagina statica nostra, non il tema Upptime.** Il tema "light" di Upptime è una app Svelte da ~600 KB che riscrive tutto in JS, con CSS rigido: per seguire il design di Zeno avrei dovuto forkare il sorgente (e perdere gli aggiornamenti). Upptime resta, invece, **motore dei controlli**: scrive `history/summary.json`, le issue dei disservizi e lo storico; la pagina li legge. Reversibile: la vecchia pagina è nel tag `legacy-upptime-site`.
- **Design preso da zenocms.io**: Satoshi (stessi pesi 400/500/700, servito dal nostro dominio e non da un CDN), gradiente viola `#BC3ACA` → fucsia `#D946A8` → arancio `#FE5104` nel titolo e nel velo in alto, pillole nere (bottone, selettore lingua), raggio 10 px, bordi e grigi dello stesso sistema, logo ufficiale; **modalità scura** automatica come il sito (`prefers-color-scheme`).
- **Barre a 90 giorni** calcolate da `dailyMinutesDown` di Upptime. Giorni prima dell'inizio del monitoraggio = grigio "nessun dato" (niente verde inventato). 0 min = verde, 1-59 = arancio, ≥60 = rosso.
- **Disservizi** dalle issue GitHub con etichetta `status`, raggruppati per giorno (fuso di Roma). Le issue con etichetta `prova-finta` (prova tecnica) restano fuori. Il testo non copia il corpo delle issue: nessun indirizzo dei controlli (uno è un segreto) può finire in pagina.
- **Bilingue come pagine separate**: `/` italiano, `/en/` inglese, `hreflang`, selettore IT/EN. Meglio di un doppio testo nella stessa pagina (lettori di schermo, SEO, nessun lampeggio).
- **Aggiornamento**: la pagina HTML viene rigenerata se lo stato cambia o ogni 30 minuti (le GitHub Pages reggono ~10 pubblicazioni all'ora); in più il browser rilegge `summary.json` al caricamento e quando la scheda torna visibile, così pillole e banner sono quelli degli ultimi 5 minuti. Nessun timer, un solo listener per le barre.
- **Iscrizione**: feed Atom `/feed.xml` (disservizi), più `/status.json` ridotto (senza URL dei controlli).
- **Accessibilità**: contrasti AA, salto al contenuto, focus visibile, ogni barra ha un testo alternativo con i giorni problematici (`role=img`), movimento ridotto rispettato.
- **Pallino del footer (PR #168)**: legge `raw.githubusercontent.com/armonia/zeno-status/master/history/summary.json` e cerca `status === "down"`. Non l'ho toccato: il file lo scrive ancora Upptime, formato identico.

## Versione compatta (1 nov 2026, anteprima su /anteprima/)
Richiesta: stessa qualità, meno spazio; lo stato dei servizi deve stare in una schermata desktop (1440x900) senza scorrere. La versione a colonna era alta 4373 px.

**Riguardate, con screenshot headless a 1440x900:** status.openai.com e linearstatus.com (entrambe incident.io), status.supabase.com (incident.io, 30+ componenti), status.openstatus.dev (OpenStatus, open source), status.betterstack.com.

Cosa prendo:
- **Banner in una riga, non un titolo enorme** (incident.io: riquadro con bordo del colore dello stato, icona + una frase + una riga di spiegazione). Aggiungo a destra il conteggio "6/6 servizi operativi", che il browser aggiorna insieme alle pillole.
- **Nome, stato e percentuale sulla stessa riga della barra** (incident.io, OpenStatus: "Marketing — 100%" sopra la barra, nessuna riga "90 giorni fa ... Oggi" sotto ogni servizio). La scala la dico una volta sola nell'intestazione della sezione.
- **Barre sottili e basse** (OpenAI/Linear: ~4 px di larghezza, ~20 px di altezza, 90 giorni anche su card da 530 px): 26 px di altezza, 2 px di spazio.
- **Legenda in una riga** (OpenStatus la mette in testa in una riga sola), con a destra la data d'inizio del monitoraggio.
- **Disservizi in lista compatta**, solo i giorni che ne hanno (incident.io rimanda a "View history" invece di elencare giorni vuoti; BetterStack li sposta in una scheda a parte). Con zero disservizi: una riga "Nessun disservizio negli ultimi 30 giorni".
- Da noi in più: con 6 servizi la colonna unica di incident.io spreca metà schermo, quindi **griglia a 2 colonne di card** (1 sotto i 700 px), e **disservizi e manutenzioni affiancati** sotto (3/5 e 2/5).

Cosa non prendo: componenti espandibili (Supabase/OpenAI, utili con decine di componenti, qui sono 6), calendario mensile di Linear (ridondante con le barre), font monospazio di OpenStatus (non è il design di Zeno).

**Misure (1440x900):** pagina intera 900 px (prima 4373), tutte e 6 le card + legenda entro 620 px, disservizi e manutenzioni visibili senza scorrere. Mobile 390 px: 1663 px, una colonna, descrizioni a capo (niente testo tagliato).

**Passaggio in produzione:** in `scripts/build.mjs` `const PRODUZIONE = "classico"` → `"compatto"`, commit e push su master: il workflow "Pagina di stato" ripubblica, la compatta va su `/` e `/en/` e `/anteprima/` smette di esistere. Tornare indietro: rimettere `"classico"`.

## Controlli ogni 5 minuti
Il cron di GitHub Actions parte ma salta ore (nelle prime 12 ore: 3 esecuzioni su ~144). Rimedio gratuito: `io.zenocms.status-trigger` (launchd sul Mac del gateway, ogni 5 minuti, `gh workflow run uptime.yml`) + cron di GitHub come rete di sicurezza. Soluzione definitiva fuori dal Mac: Cloudflare Worker con cron (pronto in `ops/cloudflare-trigger/`), richiede un token GitHub ristretto creato dal proprietario.
