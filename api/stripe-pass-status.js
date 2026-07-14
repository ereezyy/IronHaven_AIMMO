/**
 * Vercel serverless — Iron Haven Pass status restore.
 * GET /api/stripe-pass-status?playerId=…
 */
const globalStore =
  globalThis.__ihPassSubs || (globalThis.__ihPassSubs = new Map());

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'authorization, x-client-info, apikey, content-type'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end('ok');
    return;
  }

  let playerId =
    (req.query && (req.query.playerId || req.query.player_id)) || null;

  if (req.method === 'POST') {
    try {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      playerId = body.playerId || body.player_id || playerId;
    } catch {
      /* ignore */
    }
  }

  if (!playerId) {
    res.status(200).json({ active: false, expiresAt: 0, hint: 'pass playerId' });
    return;
  }

  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    try {
      const r = await fetch(
        `${sbUrl.replace(/\/$/, '')}/rest/v1/ironhaven_pass_subs?player_id=eq.${encodeURIComponent(playerId)}&select=expires_at,status`,
        {
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
          },
        }
      );
      if (r.ok) {
        const rows = await r.json();
        const row = rows[0];
        if (row) {
          const expiresAt = new Date(row.expires_at).getTime();
          const active =
            (row.status === 'active' || row.status === 'trialing') &&
            expiresAt > Date.now();
          res.status(200).json({
            active,
            expiresAt: active ? expiresAt : 0,
            status: row.status,
          });
          return;
        }
      }
    } catch {
      /* memory fallback */
    }
  }

  const row = globalStore.get(playerId);
  if (!row) {
    res.status(200).json({ active: false, expiresAt: 0 });
    return;
  }
  const expiresAt = new Date(row.expires_at).getTime();
  const active =
    (row.status === 'active' || row.status === 'trialing') &&
    expiresAt > Date.now();
  res.status(200).json({
    active,
    expiresAt: active ? expiresAt : 0,
    status: row.status,
  });
}
