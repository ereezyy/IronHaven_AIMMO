/**
 * Deploy Iron Haven to Vercel (production).
 * - Builds with VITE_* from local .env
 * - Sets server secrets for /api/* (never as VITE_)
 * - Does not print secret values
 *
 * Usage: node scripts/deploy-vercel.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function parseEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return {};
  const map = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    map[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return map;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.server') };

// Production Pass API will be on this deployment after first URL is known.
// Placeholder until we rewrite after deploy.
const clientEnv = {
  VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
  VITE_XAI_API_KEY: env.VITE_XAI_API_KEY || '',
  VITE_STRIPE_PUBLISHABLE_KEY: env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  VITE_STRIPE_PAYMENT_LINK: env.VITE_STRIPE_PAYMENT_LINK || '',
  // relative API works on same origin after deploy
  VITE_STRIPE_PASS_API: '/api/stripe-pass-status',
};

const serverEnv = {
  STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET || '',
  SUPABASE_URL: env.VITE_SUPABASE_URL || env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || '',
};

console.log('Client env keys for build:', Object.keys(clientEnv).join(', '));
console.log(
  'Server env keys:',
  Object.entries(serverEnv)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ') || '(none set)'
);

// Write temporary .env.production.local for Vite build (gitignored by *.local)
const prodLocal = Object.entries(clientEnv)
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');
fs.writeFileSync(path.join(root, '.env.production.local'), prodLocal + '\n');
console.log('Wrote .env.production.local for Vite build');

// Ensure .gitignore covers it
const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
if (!gi.includes('.env.production.local')) {
  fs.appendFileSync(path.join(root, '.gitignore'), '\n.env.production.local\n');
}

function run(cmd, args, extraEnv = {}) {
  console.log('>', cmd, args.join(' '));
  const r = spawnSync(cmd, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv, ...clientEnv },
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

// Link / deploy non-interactive
run('npx', [
  'vercel',
  'deploy',
  '--prod',
  '--yes',
  '--name',
  'ironhaven-aimmo',
]);

// Pull deployment URL from .vercel if available
let projectUrl = '';
try {
  const proj = JSON.parse(
    fs.readFileSync(path.join(root, '.vercel', 'project.json'), 'utf8')
  );
  console.log('Linked project:', proj.projectName || proj.projectId);
} catch {
  /* first deploy creates it */
}

// Set production env on Vercel for serverless + rebuilds
function vercelEnvAdd(key, value, target = 'production') {
  if (!value) return;
  // vercel env add is interactive; use `vercel env rm` then pipe
  const rm = spawnSync(
    'npx',
    ['vercel', 'env', 'rm', key, target, '--yes'],
    { cwd: root, shell: true, stdio: 'pipe' }
  );
  const add = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, target],
    {
      cwd: root,
      shell: true,
      input: value + '\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );
  if (add.status === 0) {
    console.log('Set env', key, '→', target);
  } else {
    console.warn(
      'Could not set',
      key,
      (add.stderr || add.stdout || '').toString().slice(0, 120)
    );
  }
}

for (const [k, v] of Object.entries({ ...clientEnv, ...serverEnv })) {
  vercelEnvAdd(k, v, 'production');
}

// Redeploy so serverless gets secrets and client gets relative API
console.log('Redeploying with env…');
run('npx', ['vercel', 'deploy', '--prod', '--yes']);

console.log('\nDone. Fetch latest URL:');
console.log('  npx vercel ls ironhaven-aimmo');
console.log('Then register webhook:');
console.log(
  '  node scripts/create-stripe-webhook.mjs https://YOUR_DOMAIN/api/stripe-pass-webhook'
);
console.log(
  'And update Payment Link success URL to https://YOUR_DOMAIN/?pass=success'
);
