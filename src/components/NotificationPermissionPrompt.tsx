import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { nativePushAvailable, notificationPermissionGranted, setDevicePushEnabled } from '@/lib/pushNotifications';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function NotificationPermissionPrompt() {
  const { pathname } = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setOpen(false); setError('');
    if (!nativePushAvailable() || !['/feed', '/notifications'].includes(pathname)) return;
    let alive = true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive || !session || sessionStorage.getItem(`push-prompt:${session.user.id}`)) return;
      const granted = await notificationPermissionGranted();
      if (alive && !granted) { setUserId(session.user.id); setOpen(true); }
    };
    void check().catch(() => {});
    return () => { alive = false; };
  }, [pathname]);
  const dismiss = () => {
    if (busy) return;
    if (userId) sessionStorage.setItem(`push-prompt:${userId}`, 'seen');
    setOpen(false);
  };
  const enable = async () => {
    if (!userId || busy) return;
    setBusy(true); setError('');
    try {
      const enabled = await setDevicePushEnabled(userId, true, true);
      if (!enabled) { setError('Notifications were not allowed. You can try again here. If Android has blocked further requests, its app notification settings must be changed.'); return; }
      const { error: saveError } = await supabase.from('notification_preferences').upsert({ user_id: userId, push_enabled: true }, { onConflict: 'user_id' });
      if (saveError) { await setDevicePushEnabled(userId, false); throw saveError; }
      sessionStorage.setItem(`push-prompt:${userId}`, 'seen'); setOpen(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not enable notifications. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!value) dismiss(); }}>
    <DialogContent className="max-w-sm rounded-2xl">
      <Bell className="h-7 w-7 text-primary" />
      <DialogTitle>Allow notifications?</DialogTitle>
      <DialogDescription>Get likes, replies and creator updates, even when ToonlyReels is closed.</DialogDescription>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy} onClick={enable}>{busy ? 'Connecting…' : 'Allow notifications'}</Button>
      <Button disabled={busy} variant="ghost" onClick={dismiss}>Not now</Button>
    </DialogContent>
  </Dialog>;
}
