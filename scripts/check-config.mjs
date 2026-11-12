import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Supabase configuration is missing. Copy .env.example to .env and set your project URL and publishable key.');
  process.exit(1);
}
const parsed = new URL(url);
if (parsed.pathname !== '/' || !['https:', 'http:'].includes(parsed.protocol)) {
  console.error('Use the Supabase project root URL without /rest/v1/.'); process.exit(1);
}
let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
if (key.startsWith('eyJ')) {
  try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { publicKey = false; }
}
if (!publicKey) {
  console.error('Only a Supabase publishable/anon key may be embedded in the app. Server/service-role keys are not allowed.'); process.exit(1);
}
