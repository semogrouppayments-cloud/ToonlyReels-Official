import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

export const ONESIGNAL_APP_ID = '627d3af8-e1fa-45be-b98c-74c47ddab90a';
export interface PushState { permission: boolean; optedIn: boolean }
export interface NativePushBridge {
  init(options: { appId: string }): Promise<PushState>;
  login(options: { externalId: string; jwt: string }): Promise<void>;
  logout(): Promise<void>;
  refreshIdentity(options: { externalId: string; jwt: string }): Promise<void>;
  setEnabled(options: { enabled: boolean }): Promise<PushState>;
  requestPermission(): Promise<{ granted: boolean }>;
  getState(): Promise<PushState>;
  addListener(name: 'pushAction' | 'pushIdentityInvalidated', callback: (action: { notificationId?: string; videoId?: string; commentId?: string; externalId?: string }) => void): Promise<PluginListenerHandle>;
}
const bridge = registerPlugin<NativePushBridge>('NativePush');
export const nativePushAvailable = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('NativePush');

// The controller keeps SDK changes ordered and never binds an unverified external ID.
// Dependencies are explicit so permission, logout and failure paths can be tested.
export function createPushController(native: NativePushBridge, identity: (userId: string) => Promise<{ jwt: string; externalId: string }>) {
  let initialized: Promise<PushState> | null = null;
  let linkedUser: string | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const init = () => initialized ||= native.init({ appId: ONESIGNAL_APP_ID }).catch(error => { initialized = null; throw error; });
  const ordered = <T,>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation); queue = result.catch(() => {}); return result;
  };
  return {
    state: async () => { await init(); return native.getState(); },
    refresh: (userId: string) => ordered(async () => {
      await init();
      if (linkedUser !== userId) return;
      const verified = await identity(userId);
      if (verified.externalId !== userId || !verified.jwt) throw new Error('Could not refresh notification identity');
      await native.refreshIdentity({ externalId: userId, jwt: verified.jwt });
    }),
    logout: () => ordered(async () => { await init(); await native.setEnabled({ enabled: false }); await native.logout(); linkedUser = null; }),
    apply: (userId: string, enabled: boolean, askPermission: boolean, stillCurrent = () => true) => ordered(async () => {
      await init();
      if (!enabled) { await native.setEnabled({ enabled: false }); return false; }
      try {
        if (!stillCurrent()) return false;
        if (linkedUser !== userId) {
          await native.setEnabled({ enabled: false });
          await native.logout(); linkedUser = null;
          const verified = await identity(userId);
          if (!stillCurrent()) return false;
          if (verified.externalId !== userId || !verified.jwt) throw new Error('Could not verify notification account');
          await native.login({ externalId: userId, jwt: verified.jwt }); linkedUser = userId;
        }
        if (!stillCurrent()) { await native.setEnabled({ enabled: false }); return false; }
        let { permission } = await native.getState();
        if (!permission && askPermission) permission = (await native.requestPermission()).granted;
        if (!stillCurrent()) { await native.setEnabled({ enabled: false }); return false; }
        if (!permission) { await native.setEnabled({ enabled: false }); return false; }
        const state = await native.setEnabled({ enabled: true });
        if (!stillCurrent()) { await native.setEnabled({ enabled: false }); return false; }
        return state.permission && state.optedIn;
      } catch (error) { await native.setEnabled({ enabled: false }).catch(() => {}); throw error; }
    }),
  };
}
const controller = createPushController(bridge, async userId => {
  const { data, error } = await supabase.functions.invoke('onesignal-delivery', { body: { mode: 'identity' } });
  if (error || data?.externalId !== userId || !data?.jwt) throw new Error('Notifications need setup by the app owner before they can be enabled.');
  return data;
});

let preferenceGeneration = 0;
// OS permission must remain available even before the owner's identity server is configured.
export async function requestNativeNotificationPermission() {
  if (!nativePushAvailable()) return false;
  await bridge.init({ appId: ONESIGNAL_APP_ID });
  const state = await bridge.getState();
  return state.permission || (await bridge.requestPermission()).granted;
}
export async function notificationPermissionGranted() {
  if (!nativePushAvailable()) return true;
  await bridge.init({ appId: ONESIGNAL_APP_ID });
  return (await bridge.getState()).permission;
}
export async function setDevicePushEnabled(userId: string, enabled: boolean, askPermission = false) {
  if (!nativePushAvailable()) return false;
  preferenceGeneration++;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user.id !== userId) throw new Error('Sign in again before changing notifications');
  const generation = accountGeneration;
  if (enabled && askPermission && !await requestNativeNotificationPermission()) return false;
  return controller.apply(userId, enabled, askPermission, () => generation === accountGeneration && (currentUser === null || currentUser === userId));
}

let initialized = false;
let currentUser: string | null = null;
let accountGeneration = 0;
export async function initializeNativePush() {
  if (!nativePushAvailable() || initialized) return;
  initialized = true;
  try {
  await bridge.init({ appId: ONESIGNAL_APP_ID });
  await bridge.addListener('pushAction', action => {
    const id = action.notificationId;
    const validId = typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);
    // Only app-owned routes; notification payloads cannot open arbitrary URLs.
    window.location.assign(validId ? `/notifications?notification=${encodeURIComponent(id)}` : '/notifications');
  });
  await bridge.addListener('pushIdentityInvalidated', action => {
    const user = currentUser; const generation = accountGeneration;
    if (user && user === action.externalId) void controller.refresh(user).catch(() => {
      if (currentUser === user && generation === accountGeneration) void bridge.setEnabled({ enabled: false }).catch(() => {});
    });
  });
  const synchronize = async (userId: string | null, generation: number) => {
    if (!userId) { await controller.logout(); return; }
    const preferenceVersion = preferenceGeneration;
    const { data, error } = await supabase.from('notification_preferences').select('push_enabled').eq('user_id', userId).maybeSingle();
    if (generation !== accountGeneration || preferenceVersion !== preferenceGeneration) return;
    if (error) { await controller.apply(userId, false, false); return; }
    await controller.apply(userId, data?.push_enabled === true, false, () => generation === accountGeneration && preferenceVersion === preferenceGeneration);
  };
  const update = (userId: string | null) => {
    if (currentUser !== userId) {
      accountGeneration++;
      void bridge.setEnabled({ enabled: false }).catch(() => {});
      void controller.logout().catch(() => console.warn('Could not detach notification account'));
    }
    currentUser = userId;
    const generation = accountGeneration;
    // Do not await Supabase calls inside its auth callback (auth holds a lock).
    window.setTimeout(() => { void synchronize(userId, generation).catch(() => console.warn('Push setup is not ready')); }, 0);
  };
  supabase.auth.onAuthStateChange((event, session) => { if (event !== 'TOKEN_REFRESHED') update(session?.user.id || null); });
  const { data: { session } } = await supabase.auth.getSession(); update(session?.user.id || null);
  await App.addListener('appStateChange', ({ isActive }) => { if (isActive) update(currentUser); });
  } catch (error) { initialized = false; throw error; }
}
