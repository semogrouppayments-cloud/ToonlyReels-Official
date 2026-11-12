import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers: corsHeaders });
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return new Response(JSON.stringify({ error: 'Sign in required' }), { status: 401, headers: corsHeaders });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: corsHeaders });
    const { data: request, error: requestError } = await admin.from('account_deletion_requests')
      .insert({ user_id: user.id, status: 'processing' }).select('id').single();
    if (requestError) throw requestError;
    // List before deleting, then restart from offset zero; nested rendition folders are included.
    const removePrefix = async (bucket: string, prefix: string, depth = 0): Promise<void> => {
      if (depth > 30) throw new Error('Storage hierarchy exceeds cleanup limit');
      while (true) {
        const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset: 0 });
        if (error) throw error;
        if (!data?.length) return;
        const files: string[] = [];
        for (const item of data) {
          const itemPath = `${prefix}/${item.name}`;
          if (item.id) files.push(itemPath);
          else await removePrefix(bucket, itemPath, depth + 1);
        }
        if (files.length) {
          const { error: removeError } = await admin.storage.from(bucket).remove(files);
          if (removeError) throw removeError;
        }
      }
    };
    try {
      for (const bucket of ['videos', 'avatars', 'verification-documents']) await removePrefix(bucket, user.id);
      // Auth deletion cascades through all account-owned tables and private PIN/session records.
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw error;
      await admin.from('account_deletion_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', request.id);
    } catch (error) {
      await admin.from('account_deletion_requests').update({ status: 'failed', last_error: 'Cleanup did not complete; retry is supported' }).eq('id', request.id);
      throw error;
    }
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({ error: 'Account deletion did not complete. Please retry or contact support.' }), { status: 500, headers: corsHeaders });
  }
});
