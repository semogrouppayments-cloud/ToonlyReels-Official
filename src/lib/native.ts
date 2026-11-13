import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

export const authRedirectUrl = () => Capacitor.isNativePlatform()
  ? 'com.semogroup.toonlyreels://auth/callback'
  : `${window.location.origin}/auth`;

export const initializeNativeAuth = async () => {
  if (!Capacitor.isNativePlatform()) return;
  const handleUrl = async (url: string) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'com.semogroup.toonlyreels:' || parsed.host !== 'auth' || parsed.pathname !== '/callback') return;
    const code = parsed.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) { console.error('Could not complete sign-in callback'); return; }
    } else {
      const params = new URLSearchParams(parsed.hash.slice(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) return;
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) { console.error('Could not complete sign-in callback'); return; }
    }
    window.location.assign('/feed');
  };
  await App.addListener('appUrlOpen', ({ url }) => { handleUrl(url).catch(() => console.error('Invalid sign-in callback')); });
  const launch = await App.getLaunchUrl();
  if (launch?.url) await handleUrl(launch.url);
};
