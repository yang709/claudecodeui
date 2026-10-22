export function normalizeUsage(result, now = Date.now()) {
  const groups = result?.rateLimitsByLimitId;
  const buckets = groups && Object.keys(groups).length ? Object.entries(groups) : [['codex', result?.rateLimits]];
  return {
    updatedAt: new Date(now).toISOString(),
    limits: buckets.filter(([, value]) => value && typeof value === 'object').map(([id, value]) => ({
      id, name: typeof value.limitName === 'string' ? value.limitName : id,
      windows: ['primary', 'secondary'].flatMap(key => {
        const window = value[key];
        if (!window) return [];
        const used = typeof window.usedPercent === 'number' && Number.isFinite(window.usedPercent) ? window.usedPercent : null;
        return [{ key, remainingPercent: used === null ? null : Math.max(0, Math.min(100, 100 - used)),
          windowDurationMins: Number.isFinite(window.windowDurationMins) ? window.windowDurationMins : null,
          resetsAt: Number.isFinite(window.resetsAt) ? window.resetsAt : null }];
      }),
    })),
  };
}

export function createUsageHandler(read, { ttl = 30_000, now = Date.now } = {}) {
  let cache, expires = 0, pending;
  return async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (!cache || now() >= expires) {
        if (!pending) pending = Promise.resolve().then(read).then(result => {
          cache = normalizeUsage(result, now()); expires = now() + ttl; return cache;
        }).finally(() => { pending = null; });
        await pending;
      }
      return res.json(cache);
    } catch {
      // Never expose CLI stderr, auth details or local paths to the browser.
      return res.status(503).json({ error: '暂时无法读取 Codex 额度，请稍后刷新；请确认本机 Codex 已登录 ChatGPT。' });
    }
  };
}
