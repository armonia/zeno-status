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

## Controlli ogni 5 minuti
Il cron di GitHub Actions parte ma salta ore (nelle prime 12 ore: 3 esecuzioni su ~144). Rimedio gratuito: `io.zenocms.status-trigger` (launchd sul Mac del gateway, ogni 5 minuti, `gh workflow run uptime.yml`) + cron di GitHub come rete di sicurezza. Soluzione definitiva fuori dal Mac: Cloudflare Worker con cron (pronto in `ops/cloudflare-trigger/`), richiede un token GitHub ristretto creato dal proprietario.
