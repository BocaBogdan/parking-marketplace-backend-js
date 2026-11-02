// Pings the Render API on a cron so its free instance never idles long enough to spin down

interface Env {
  HEALTH_URL: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

async function ping(url: string) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'keepalive-worker' } });
    if (!response.ok) console.error(`Keep-alive got ${response.status} from ${url}`);
  } catch (error) {
    console.error(`Keep-alive failed for ${url}`, error);
  }
}

export default {
  scheduled(_event: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(ping(env.HEALTH_URL));
  },
};
