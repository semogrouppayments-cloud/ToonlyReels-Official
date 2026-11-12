import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const reject = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers });

// compare hashed values so a configured job secret is never exposed or compared by prefix.
const matchesSecret = async (provided: string, expected: string) => {
  if (!provided || !expected) return false;
  const hash = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [left, right] = await Promise.all([hash(provided), hash(expected)]);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
};

export async function authorize(req: Request, mode: 'user' | 'admin' | 'job' | 'admin-or-job' = 'user', feature?: string): Promise<Response | null> {
  if (req.method !== 'POST') return reject(405, 'Use POST');
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  if ((mode === 'job' || mode === 'admin-or-job') && await matchesSecret(token, Deno.env.get('CRON_SECRET') || '')) return null;
  if (mode === 'job') return reject(401, 'Scheduler authorization required');
  if (!token) return reject(401, 'Sign in required');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return reject(503, 'Backend configuration is incomplete');
  const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return reject(401, 'Invalid session');
  if (mode === 'admin' || mode === 'admin-or-job') {
    const { data: admin, error: roleError } = await client.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (roleError || !admin) return reject(403, 'Admin access required');
  }
  if (feature) {
    const { data: allowed, error: quotaError } = await client.rpc('consume_api_quota', { _feature: feature });
    if (quotaError) return reject(503, 'Usage limits are not configured');
    if (!allowed) return reject(429, 'Daily usage limit reached');
  }
  return null;
}
