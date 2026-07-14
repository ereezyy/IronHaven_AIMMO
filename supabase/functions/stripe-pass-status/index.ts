/**
 * Supabase Edge Function — restore Iron Haven Pass status for a player.
 *
 * Deploy:
 *   supabase functions deploy stripe-pass-status --no-verify-jwt
 *
 * Client: VITE_STRIPE_PASS_API=https://<ref>.supabase.co/functions/v1/stripe-pass-status
 * GET ?playerId=player_xxx  →  { active, expiresAt }
 */

// @ts-expect-error Deno edge runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error Deno edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return json({ ok: true, service: 'stripe-pass-status' });
  }

  let playerId: string | null = null;
  const url = new URL(req.url);
  playerId = url.searchParams.get('playerId') || url.searchParams.get('player_id');

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      playerId = body.playerId || body.player_id || playerId;
    } catch {
      /* ignore */
    }
  }

  if (!playerId) {
    // Without player id, report whether service is up (no secret leak).
    return json({ active: false, expiresAt: 0, hint: 'pass playerId' });
  }

  const sbUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!sbUrl || !serviceKey) {
    return json({ error: 'server misconfigured' }, 500);
  }

  const sb = createClient(sbUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await sb
    .from('ironhaven_pass_subs')
    .select('expires_at, status')
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    console.error('[stripe-pass-status]', error.message);
    return json({ active: false, expiresAt: 0, error: 'db' }, 500);
  }

  if (!data) {
    return json({ active: false, expiresAt: 0 });
  }

  const expiresAt = new Date(data.expires_at).getTime();
  const active =
    data.status === 'active' || data.status === 'trialing'
      ? expiresAt > Date.now()
      : false;

  return json({
    active,
    expiresAt: active ? expiresAt : 0,
    status: data.status,
  });
});
