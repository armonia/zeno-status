// Genera la pagina di stato statica in ./dist dai dati che Upptime scrive nel repo
// (history/summary.json) e dai disservizi (issue GitHub con etichetta "status").
// Nessuna dipendenza. Uso: node scripts/build.mjs [--offline]
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");
const SITE = "https://status.zenocms.io";
const REPO = "armonia/zeno-status";
const DAYS = 90;
const offline = process.argv.includes("--offline");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const labels = JSON.parse(readFileSync(join(ROOT, "site/servizi.json"), "utf8"));
const summary = JSON.parse(readFileSync(join(ROOT, "history/summary.json"), "utf8"));
const now = new Date();

// ---------- date ----------
const dayKey = (d) => d.toISOString().slice(0, 10);
const days = [];
for (let i = DAYS - 1; i >= 0; i--) days.push(dayKey(new Date(now.getTime() - i * 86400000)));
const fmtDay = (iso, loc) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));
const fmtDayLong = (iso, loc) => new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" }).format(new Date(iso));
const fmtHour = (d, loc) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(new Date(d));
const romeDay = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(d));

// Primo giorno con dati per servizio: primo commit del file di storia (fallback: oggi).
function startDay(slug) {
  try {
    const out = execFileSync("git", ["log", "--diff-filter=A", "--format=%aI", "--", `history/${slug}.yml`], { cwd: ROOT, encoding: "utf8" }).trim().split("\n").filter(Boolean);
    if (out.length) return out[out.length - 1].slice(0, 10);
  } catch { /* nessun git: nessuna data di inizio */ }
  return days[days.length - 1];
}

// ---------- servizi ----------
const services = summary.map((s) => {
  const lab = labels[s.slug] ?? { it: s.name.split(" · ")[0], en: (s.name.split(" · ")[1] ?? s.name), dIt: "", dEn: "" };
  const start = startDay(s.slug);
  let known = 0, down = 0;
  const bars = days.map((d) => {
    if (d < start) return { d, s: "none" };
    const m = Math.min(1440, Number(s.dailyMinutesDown?.[d] ?? 0));
    // il giorno in corso conta solo le ore trascorse
    const total = d === days[days.length - 1] ? Math.max(1, now.getUTCHours() * 60 + now.getUTCMinutes()) : 1440;
    known += total; down += m;
    const pct = Math.max(0, 100 - (m / total) * 100);
    return { d, s: m === 0 ? "ok" : m >= 60 ? "major" : "minor", m, pct };
  });
  const uptime = known ? Math.max(0, 100 - (down / known) * 100) : null;
  return { slug: s.slug, lab, status: s.status === "down" ? "down" : s.status === "degraded" ? "degraded" : "up", ms: s.time, bars, uptime, start };
});

// ---------- disservizi e manutenzioni (issue GitHub) ----------
async function issues() {
  if (offline) return JSON.parse(readFileSync(join(ROOT, "scripts/issues-offline.json"), "utf8"));
  let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) { try { token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim(); } catch { /* senza token: limite pubblico */ } }
  const r = await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=100&labels=status`, {
    headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!r.ok) throw new Error(`GitHub issues ${r.status}`);
  const status = await r.json();
  const rm = await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=50&labels=maintenance`, {
    headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return [...status, ...(rm.ok ? await rm.json() : [])];
}
const raw = (await issues()).filter((i) => !i.pull_request);
const hasLabel = (i, n) => i.labels.some((l) => (l.name ?? l) === n);
const slugOf = (i) => services.find((s) => i.labels.some((l) => (l.name ?? l) === s.slug));
const incidents = raw
  .filter((i) => hasLabel(i, "status") && !hasLabel(i, "prova-finta"))
  .map((i) => {
    const sv = slugOf(i);
    const end = i.closed_at ? new Date(i.closed_at) : null;
    const mins = end ? Math.max(1, Math.round((end - new Date(i.created_at)) / 60000)) : null;
    return { n: i.number, sv, start: i.created_at, end: i.closed_at, mins, day: romeDay(i.created_at) };
  })
  .filter((i) => i.sv)
  .sort((a, b) => b.start.localeCompare(a.start));
const maint = raw.filter((i) => hasLabel(i, "maintenance")).map((i) => {
  const m = /start:\s*([0-9T:\-.Z+]+)[\s\S]*?end:\s*([0-9T:\-.Z+]+)/.exec(i.body ?? "");
  return m ? { title: i.title, start: m[1], end: m[2], n: i.number } : null;
}).filter(Boolean).sort((a, b) => b.start.localeCompare(a.start));
const upcoming = maint.filter((m) => new Date(m.end) > now);
const pastMaint = maint.filter((m) => new Date(m.end) <= now);

// ---------- stato globale ----------
const downNow = services.filter((s) => s.status === "down");
const degNow = services.filter((s) => s.status === "degraded");
const global = downNow.length === services.length && services.length ? "major" : downNow.length ? "partial" : degNow.length ? "degraded" : "ok";
const globalTxt = {
  ok: ["Tutti i sistemi funzionano", "All systems operational"],
  degraded: ["Alcuni servizi sono rallentati", "Some services are degraded"],
  partial: ["Disservizio parziale in corso", "Partial outage in progress"],
  major: ["Disservizio in corso", "Major outage in progress"],
}[global];
let L = "it";
const bi = (it, en) => (L === "it" ? it : en);
const stTxt = { up: ["Operativo", "Operational"], degraded: ["Rallentato", "Degraded"], down: ["Fermo", "Down"] };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const updated = now.toISOString();
for (const lang of ["it", "en"]) {
L = lang;
// ---------- HTML ----------
const fmtPct = (u) => (u === null ? "—" : u >= 99.995 ? "100%" : u.toFixed(2).replace(/0$/, "") + "%");
const fmtPctIt = (u) => fmtPct(u).replace(".", ",");
const barsHtml = (s) =>
  s.bars.map((b) => `<i class="b ${b.s}" data-d="${b.d}"${b.s === "none" ? "" : ` data-p="${b.pct.toFixed(2)}" data-m="${b.m}"`}></i>`).join("");
const problemDays = (s) => s.bars.filter((b) => b.s === "minor" || b.s === "major");
const srDays = (s, lc) => {
  const p = problemDays(s);
  if (!p.length) return lc === "it" ? "Nessun disservizio negli ultimi 90 giorni." : "No incidents in the last 90 days.";
  return p.map((b) => `${fmtDay(b.d, lc)}: ${b.m} ${lc === "it" ? "minuti di disservizio" : "minutes of downtime"}`).join("; ");
};
const serviceHtml = (s) => `
<article class="svc" aria-labelledby="h-${s.slug}">
  <div class="svc-top">
    <div class="svc-name"><h3 id="h-${s.slug}">${bi(esc(s.lab.it), esc(s.lab.en))}</h3>
      <p class="muted">${bi(esc(s.lab.dIt), esc(s.lab.dEn))}</p></div>
    <span class="pill ${s.status}" data-slug="${s.slug}"><i class="dot"></i><span class="pt">${bi(...stTxt[s.status])}</span></span>
  </div>
  <div class="bars" role="img" aria-labelledby="d-${s.slug}">${barsHtml(s)}</div>
  <p class="sr" id="d-${s.slug}">${esc(L === "it" ? "Ultimi 90 giorni. " : "Last 90 days. ")}${esc(srDays(s, L))}</p>
  <div class="svc-foot muted"><span>${bi("90 giorni fa", "90 days ago")}</span><span class="up">${bi(fmtPctIt(s.uptime) + " attivo", fmtPct(s.uptime) + " uptime")}${s.ms ? ` · ${s.ms} ms` : ""}</span><span>${bi("Oggi", "Today")}</span></div>
</article>`;

const servicesHtml = services.map(serviceHtml).join("");

// incidenti: ultimi 90 giorni raggruppati per giorno (Roma), come status.claude.com
const dayList = [];
for (let i = 0; i < 30; i++) dayList.push(romeDay(new Date(now.getTime() - i * 86400000)));
const incHtml = dayList.map((d) => {
  const list = incidents.filter((i) => i.day === d);
  const body = list.length
    ? list.map((i) => {
        const open = !i.end;
        const nm = i.sv.lab;
        return `<div class="inc ${open ? "open" : ""}">
        <h4>${bi(`${esc(nm.it)} non raggiungibile`, `${esc(nm.en)} unreachable`)}</h4>
        <p class="muted"><b>${open ? bi("In corso", "Ongoing") : bi("Risolto", "Resolved")}</b> · ${bi(fmtHour(i.start, "it-IT"), fmtHour(i.start, "en-GB"))}${open ? "" : ` → ${bi(fmtHour(i.end, "it-IT"), fmtHour(i.end, "en-GB"))} (${i.mins} min)`}
        · <a href="https://github.com/${REPO}/issues/${i.n}">${bi("Dettagli", "Details")}</a></p></div>`;
      }).join("")
    : `<p class="muted none">${bi("Nessun disservizio segnalato.", "No incidents reported.")}</p>`;
  return `<section class="day"><h3><time datetime="${d}">${bi(esc(fmtDayLong(d + "T12:00:00Z", "it-IT")), esc(fmtDayLong(d + "T12:00:00Z", "en-GB")))}</time></h3>${body}</section>`;
}).join("");

const maintHtml = [...upcoming, ...pastMaint.slice(0, 5)].length
  ? `<section class="card-sec"><h2>${bi("Manutenzioni", "Maintenance")}</h2>${[...upcoming, ...pastMaint.slice(0, 5)].map((m) =>
      `<div class="inc"><h4>${esc(m.title)}</h4><p class="muted">${bi(fmtHour(m.start, "it-IT"), fmtHour(m.start, "en-GB"))} → ${bi(fmtHour(m.end, "it-IT"), fmtHour(m.end, "en-GB"))}</p></div>`).join("")}</section>`
  : "";

const html = `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${L === "it" ? "Zeno CMS · Stato dei servizi" : "Zeno CMS · Service status"}</title>
<meta name="description" content="${L === "it" ? "Stato in tempo reale dei servizi Zeno CMS, con storico a 90 giorni." : "Real-time status of Zeno CMS services with a 90-day history."}">
<meta name="color-scheme" content="light dark">
<meta property="og:title" content="Zeno CMS · ${L === "it" ? "Stato dei servizi" : "Service status"}">
<meta property="og:description" content="${esc(bi(globalTxt[0], globalTxt[1]))}">
<meta property="og:type" content="website"><meta property="og:url" content="${SITE}/">
<link rel="canonical" href="${SITE}${L === "it" ? "/" : "/en/"}">
<link rel="alternate" hreflang="it" href="${SITE}/">
<link rel="alternate" hreflang="en" href="${SITE}/en/">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="Zeno CMS · Stato" href="/feed.xml">
<link rel="preload" href="/fonts/satoshi-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/style.css">
</head>
<body class="g-${global}">
<a class="skip" href="#main">${bi("Vai al contenuto", "Skip to content")}</a>
<header class="top"><div class="wrap top-in">
  <a class="logo" href="https://zenocms.io" aria-label="Zeno CMS"><img class="logo-l" src="/img/logo-zeno-black.svg" alt="Zeno" height="24"><img class="logo-d" src="/img/logo-zeno-white.svg" alt="" height="24"><span class="logo-tag">${bi("Stato", "Status")}</span></a>
  <nav class="top-nav" aria-label="Menu">
    <div class="lang" role="group" aria-label="Lingua / Language"><a href="/" hreflang="it" lang="it"${L === "it" ? ' aria-current="true"' : ""}>IT</a><a href="/en/" hreflang="en" lang="en"${L === "en" ? ' aria-current="true"' : ""}>EN</a></div>
    <a class="btn" href="/feed.xml" aria-label="${bi("Iscriviti agli aggiornamenti (feed Atom)", "Subscribe to updates (Atom feed)")}">${bi("Iscriviti", "Subscribe")}</a>
  </nav>
</div></header>
<main id="main" class="wrap">
  <section class="hero" aria-live="polite">
    <h1 class="banner ${global}"><i class="dot big"></i><span class="bt">${bi(globalTxt[0], globalTxt[1])}</span></h1>
    <p class="muted">${bi("Controlli automatici ogni 5 minuti, da fuori dall'infrastruttura di Zeno, con storico pubblico.", "Automated checks every 5 minutes, from outside Zeno's own infrastructure, with a public history.")}</p>
  </section>
  ${upcoming.length ? maintHtml : ""}
  <section class="card-sec" aria-labelledby="h-svc">
    <div class="sec-head"><h2 id="h-svc">${bi("Servizi", "Services")}</h2><span class="muted">${bi("Ultimi 90 giorni", "Last 90 days")}</span></div>
    ${servicesHtml}
    <div class="legend muted"><span><i class="b ok"></i>${bi("Operativo", "Operational")}</span><span><i class="b minor"></i>${bi("Problemi parziali", "Partial issues")}</span><span><i class="b major"></i>${bi("Disservizio", "Outage")}</span><span><i class="b none"></i>${bi("Nessun dato", "No data")}</span></div>
    <p class="muted since">${bi("Monitoraggio attivo dal", "Monitoring active since")} ${fmtDay(services.map((x) => x.start).sort()[0], L === "it" ? "it-IT" : "en-GB")}. ${bi("Lo storico si riempie giorno dopo giorno.", "The history fills in day by day.")}</p>
  </section>
  <section aria-labelledby="h-inc" class="incs">
    <h2 id="h-inc">${bi("Disservizi passati", "Past incidents")}</h2>
    ${incHtml}
    <p class="muted">${bi("Lo storico completo è su", "The full history is on")} <a href="https://github.com/${REPO}/issues?q=label%3Astatus">GitHub</a>.</p>
  </section>
  ${upcoming.length ? "" : maintHtml}
</main>
<footer class="foot"><div class="wrap foot-in">
  <span>© Zeno CMS · <a href="https://zenocms.io">zenocms.io</a></span>
  <span><a href="/feed.xml">Atom</a> · <a href="https://github.com/${REPO}">${bi("Codice aperto", "Open source")}</a> · ${bi("Controlli con", "Checks by")} <a href="https://upptime.js.org">Upptime</a></span>
</div></footer>
<div id="tip" class="tip" role="status" hidden></div>
<script src="/app.js" defer></script>
</body></html>
`;


mkdirSync(lang === "it" ? OUT : join(OUT, "en"), { recursive: true });
writeFileSync(join(lang === "it" ? OUT : join(OUT, "en"), "index.html"), html);
if (lang === "it") writeFileSync(join(OUT, "404.html"), html.replace("<title>", "<!-- 404 --><title>"));
}
// ---------- feed Atom ----------
const entries = incidents.slice(0, 30).map((i) => {
  const t = `${i.sv.lab.it} · ${i.sv.lab.en}: ${i.end ? "risolto / resolved" : "disservizio in corso / ongoing"}`;
  return `<entry><id>${SITE}/#incidente-${i.n}</id><title>${esc(t)}</title><updated>${new Date(i.end ?? i.start).toISOString()}</updated><link href="https://github.com/${REPO}/issues/${i.n}"/><summary>${esc(i.end ? `Durata ${i.mins} min / Lasted ${i.mins} min` : "In corso / Ongoing")}</summary></entry>`;
}).join("");
const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><id>${SITE}/</id><title>Zeno CMS · Stato / Status</title><subtitle>${esc(globalTxt.join(" · "))}</subtitle><link href="${SITE}/feed.xml" rel="self"/><link href="${SITE}/"/><updated>${incidents[0] ? new Date(incidents[0].end ?? incidents[0].start).toISOString() : updated}</updated>${entries}</feed>
`;

// ---------- uscita ----------
for (const f of ["style.css", "app.js"]) cpSync(join(ROOT, "site", f), join(OUT, f));
cpSync(join(ROOT, "site/fonts"), join(OUT, "fonts"), { recursive: true });
cpSync(join(ROOT, "site/img"), join(OUT, "img"), { recursive: true });
writeFileSync(join(OUT, "feed.xml"), feed);
// Dati pubblici ridotti: niente url dei controlli (uno è un segreto).
writeFileSync(join(OUT, "status.json"), JSON.stringify({ updated, status: global, services: services.map((s) => ({ slug: s.slug, name: s.lab.en, status: s.status, uptime90d: s.uptime === null ? null : Number(s.uptime.toFixed(3)), responseMs: s.ms })) }, null, 1));
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n`);
writeFileSync(join(OUT, "CNAME"), "status.zenocms.io\n");
writeFileSync(join(OUT, ".nojekyll"), "");
console.log(`ok: ${services.length} servizi, ${incidents.length} disservizi, stato ${global}`);
