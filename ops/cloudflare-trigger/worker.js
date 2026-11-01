// Trigger gratuito ogni 5 minuti: il cron di GitHub Actions è inaffidabile (salta
// anche ore). Questo Worker lancia il controllo con workflow_dispatch.
// Serve un token GitHub a grana fine, SOLO su armonia/zeno-status con "Actions: Read and write".
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      fetch(`https://api.github.com/repos/armonia/zeno-status/actions/workflows/uptime.yml/dispatches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "zeno-status-trigger",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ ref: "master" }),
      }).then((r) => { if (r.status !== 204) console.error("dispatch", r.status); }),
    );
  },
};
