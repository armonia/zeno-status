// Tooltip delle barre (un solo listener delegato) e lettura dello stato aggiornato
// dal riepilogo pubblico di Upptime. Nessun timer, nessun polling: una lettura al
// caricamento e una quando la scheda torna visibile dopo più di 2 minuti.
(() => {
  const it = document.documentElement.lang === "it";
  const tip = document.getElementById("tip");
  const fmt = new Intl.DateTimeFormat(it ? "it-IT" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const show = (el) => {
    const p = el.dataset.p;
    let msg;
    if (p === undefined) msg = it ? "Nessun dato" : "No data";
    else if (el.dataset.m === "0") msg = it ? "Nessun disservizio" : "No downtime recorded";
    else msg = it ? `${el.dataset.m} min di disservizio · ${p.replace(".", ",")}% attivo` : `${el.dataset.m} min downtime · ${p}% uptime`;
    tip.replaceChildren();
    const b = document.createElement("b");
    b.textContent = fmt.format(new Date(el.dataset.d + "T12:00:00Z"));
    tip.append(b, document.createElement("br"), msg);
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), document.documentElement.clientWidth - w - 8);
    tip.style.left = `${x + window.scrollX}px`;
    tip.style.top = `${r.top + window.scrollY - tip.offsetHeight - 8}px`;
  };
  const hide = () => { tip.hidden = true; };
  for (const bars of document.querySelectorAll(".bars")) {
    bars.addEventListener("pointerover", (e) => { if (e.target.classList.contains("b")) show(e.target); });
    bars.addEventListener("pointerleave", hide);
    bars.addEventListener("pointerdown", (e) => { if (e.target.classList.contains("b")) show(e.target); });
  }

  // Stato in tempo reale: la pagina è statica, il riepilogo è la fonte che Upptime aggiorna ogni 5 minuti.
  const SUMMARY = "https://raw.githubusercontent.com/armonia/zeno-status/master/history/summary.json";
  const ST = { up: it ? "Operativo" : "Operational", degraded: it ? "Rallentato" : "Degraded", down: it ? "Fermo" : "Down" };
  const GL = {
    ok: it ? "Tutti i sistemi funzionano" : "All systems operational",
    degraded: it ? "Alcuni servizi sono rallentati" : "Some services are degraded",
    partial: it ? "Disservizio parziale in corso" : "Partial outage in progress",
    major: it ? "Disservizio in corso" : "Major outage in progress",
  };
  let last = Date.now();
  async function refresh() {
    last = Date.now();
    try {
      const res = await fetch(SUMMARY, { signal: AbortSignal.timeout(5000), credentials: "omit" });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return;
      let down = 0, deg = 0;
      for (const s of data) {
        const st = s.status === "down" ? "down" : s.status === "degraded" ? "degraded" : "up";
        down += st === "down"; deg += st === "degraded";
        const pill = document.querySelector(`.pill[data-slug="${CSS.escape(s.slug)}"]`);
        if (!pill) continue;
        pill.className = `pill ${st}`;
        pill.querySelector(".pt").textContent = ST[st];
      }
      const g = down === data.length ? "major" : down ? "partial" : deg ? "degraded" : "ok";
      const banner = document.querySelector(".banner");
      banner.className = `banner ${g}`;
      banner.querySelector(".bt").textContent = GL[g];
      document.body.className = `g-${g}`;
    } catch { /* senza rete resta lo stato della pagina */ }
  }
  refresh();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - last > 120000) refresh();
  });
})();
