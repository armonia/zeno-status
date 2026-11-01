# Trigger ogni 5 minuti (Cloudflare Worker, gratis)

1. Crea un token GitHub a grana fine: solo repo `armonia/zeno-status`, permesso **Actions: Read and write**, nient'altro.
2. `cd ops/cloudflare-trigger && npx wrangler deploy && npx wrangler secret put GITHUB_TOKEN`
3. Il piano gratuito di Cloudflare include i Cron Triggers.

Finché non c'è il Worker, lo stesso lancio lo fa un'attività launchd sul Mac del gateway
(`io.zenocms.status-trigger`, vedi docs/DESIGN-RICERCA.md) e il cron di GitHub fa da rete di sicurezza.
