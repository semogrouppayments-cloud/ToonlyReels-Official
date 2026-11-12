import { test, expect } from '@playwright/test';

// Exercise orchestration with a fake Capacitor boundary only. Never contact OneSignal.
test.beforeEach(async ({ page }) => {
  await page.route('https://**', route => route.fulfill({ json: [] }));
  await page.goto('/tests/playback/harness.html?paused=1');
  await page.evaluate(async () => {
    const { createPushController } = await import('/src/lib/pushNotifications.ts');
    window['makePushHarness'] = () => {
      const calls = [];
      let permission = true, optedIn = false;
      let identity = async userId => ({ externalId: userId, jwt: `verified.${userId}.signature` });
      let request = async () => ({ granted: permission });
      let login = async () => {};
      const native = {
        init: async options => { calls.push({ method: 'init', ...options }); return { permission, optedIn }; },
        login: async options => { calls.push({ method: 'login', ...options }); await login(options); },
        logout: async () => { calls.push({ method: 'logout' }); },
        refreshIdentity: async options => { calls.push({ method: 'refresh', ...options }); },
        setEnabled: async ({ enabled }) => { calls.push({ method: 'enabled', enabled }); optedIn = enabled && permission; return { permission, optedIn }; },
        requestPermission: async () => { calls.push({ method: 'permission' }); const result = await request(); permission = result.granted; return result; },
        getState: async () => { calls.push({ method: 'state' }); return { permission, optedIn }; },
        addListener: async () => ({ remove: async () => {} }),
      };
      return {
        calls, native,
        controller: createPushController(native, async userId => { calls.push({ method: 'identity', userId }); return identity(userId); }),
        setPermission: value => { permission = value; },
        setIdentity: callback => { identity = callback; },
        setRequest: callback => { request = callback; },
        setLogin: callback => { login = callback; },
      };
    };
  });
});

test('waits for a verified identity before linking or opting in', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness']();
    let resolveIdentity;
    h.setIdentity(userId => new Promise(resolve => { resolveIdentity = () => resolve({ externalId: userId, jwt: 'verified.jwt.signature' }); }));
    const pending = h.controller.apply('user-a', true, false);
    await new Promise(resolve => setTimeout(resolve, 0));
    const before = h.calls.map(call => ({ ...call }));
    resolveIdentity();
    const enabled = await pending;
    return { before, calls: h.calls, enabled };
  });
  expect(result.before.some(call => call.method === 'identity')).toBe(true);
  expect(result.before.some(call => call.method === 'login' || call.method === 'enabled' && call.enabled)).toBe(false);
  expect(result.enabled).toBe(true);
  expect(result.calls.findIndex(call => call.method === 'identity')).toBeLessThan(result.calls.findIndex(call => call.method === 'login'));
  expect(result.calls.find(call => call.method === 'login').jwt).toBe('verified.jwt.signature');
  expect(result.calls.filter(call => call.method === 'init')).toHaveLength(1);
});

test('fails closed when the server returns a different external identity', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness']();
    h.setIdentity(async () => ({ externalId: 'different-account', jwt: 'verified.jwt.signature' }));
    let rejected = false;
    try { await h.controller.apply('user-a', true, true); } catch { rejected = true; }
    return { rejected, calls: h.calls, state: await h.controller.state() };
  });
  expect(result.rejected).toBe(true);
  expect(result.state.optedIn).toBe(false);
  expect(result.calls.some(call => call.method === 'login' || call.method === 'permission' || call.method === 'enabled' && call.enabled)).toBe(false);
});

test('turning notifications off does not fetch an identity or prompt the OS', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness']();
    const enabled = await h.controller.apply('user-a', false, true);
    return { enabled, calls: h.calls };
  });
  expect(result.enabled).toBe(false);
  expect(result.calls.some(call => ['identity', 'login', 'permission'].includes(call.method))).toBe(false);
  expect(result.calls.filter(call => call.method === 'enabled')).toEqual([{ method: 'enabled', enabled: false }]);
});

test('denied permission keeps the subscription opted out', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness'](); h.setPermission(false);
    h.setRequest(async () => ({ granted: false }));
    return { enabled: await h.controller.apply('user-a', true, true), calls: h.calls, state: await h.controller.state() };
  });
  expect(result.enabled).toBe(false);
  expect(result.state).toEqual({ permission: false, optedIn: false });
  expect(result.calls.filter(call => call.method === 'permission')).toHaveLength(1);
  expect(result.calls.some(call => call.method === 'enabled' && call.enabled)).toBe(false);
});

test('startup synchronization never asks for notification permission', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness'](); h.setPermission(false);
    return { enabled: await h.controller.apply('user-a', true, false), calls: h.calls };
  });
  expect(result.enabled).toBe(false);
  expect(result.calls.some(call => call.method === 'permission' || call.method === 'enabled' && call.enabled)).toBe(false);
});

test('SDK login failure opts out and does not poison later operations', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness']();
    h.setLogin(async () => { throw new Error('mock SDK unavailable'); });
    let rejected = false;
    try { await h.controller.apply('user-a', true, false); } catch { rejected = true; }
    const off = await h.controller.apply('user-a', false, false);
    return { rejected, off, state: await h.controller.state(), calls: h.calls };
  });
  expect(result.rejected).toBe(true);
  expect(result.off).toBe(false);
  expect(result.state.optedIn).toBe(false);
  expect(result.calls.some(call => call.method === 'enabled' && call.enabled)).toBe(false);
});

test('serializes logout and account switching before linking the next user', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness']();
    await h.controller.apply('user-a', true, false);
    const atSwitch = h.calls.length;
    const out = h.controller.logout();
    const next = h.controller.apply('user-b', true, false);
    await out; const enabled = await next;
    return { enabled, calls: h.calls.slice(atSwitch), state: await h.controller.state() };
  });
  expect(result.enabled).toBe(true);
  expect(result.state.optedIn).toBe(true);
  const login = result.calls.findIndex(call => call.method === 'login');
  expect(result.calls[login].externalId).toBe('user-b');
  expect(result.calls.slice(0, login).some(call => call.method === 'logout')).toBe(true);
  expect(result.calls[0]).toEqual({ method: 'enabled', enabled: false });
  expect(result.calls.filter(call => call.method === 'permission')).toHaveLength(0);
});

test('refreshes only the linked identity without logging it out or prompting', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness']();
    await h.controller.apply('user-a', true, false);
    const before = h.calls.length;
    h.setIdentity(async userId => ({ externalId: userId, jwt: 'fresh.jwt.signature' }));
    await h.controller.refresh('user-a');
    await h.controller.refresh('user-b');
    return h.calls.slice(before);
  });
  expect(result).toEqual([{ method: 'identity', userId: 'user-a' }, { method: 'refresh', externalId: 'user-a', jwt: 'fresh.jwt.signature' }]);
});

test('does not opt a stale account back in after a permission dialog resolves', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window['makePushHarness'](); h.setPermission(false);
    let current = true, resolvePermission;
    h.setRequest(() => new Promise(resolve => { resolvePermission = () => resolve({ granted: true }); }));
    const pending = h.controller.apply('user-a', true, true, () => current);
    await new Promise(resolve => setTimeout(resolve, 0));
    current = false;
    resolvePermission();
    return { enabled: await pending, calls: h.calls, state: await h.controller.state() };
  });
  expect(result.enabled).toBe(false);
  expect(result.state.optedIn).toBe(false);
  expect(result.calls.some(call => call.method === 'enabled' && call.enabled)).toBe(false);
});

for (const configured of [true, false]) {
  test(configured ? 'Settings saves native push On then Off without a second permission prompt' : 'Settings keeps push off when secure provider identity is not configured', async ({ page }) => {
    const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', aud: 'authenticated', app_metadata: {}, user_metadata: {} };
    await page.addInitScript(user => {
      localStorage.setItem('sb-vxenlskelqwpghclxbjj-auth-token', JSON.stringify({ access_token: 'fixture-token', refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user }));
      const state = { permission: false, optedIn: false, prompts: 0, externalId: null };
      Object.assign(window, { nativePushTest: state, androidBridge: {}, Capacitor: {
        PluginHeaders: [{ name: 'NativePush', methods: ['init','getState','login','logout','setEnabled','requestPermission','refreshIdentity'].map(name => ({ name, rtype: 'promise' })) }],
        nativePromise: async (_plugin: string, method: string, options: { enabled?: boolean; externalId?: string; jwt?: string }) => {
          if (method === 'init' || method === 'getState') return { permission: state.permission, optedIn: state.optedIn };
          if (method === 'login') { if (options.jwt !== 'verified-fixture-jwt') throw new Error('Unverified login'); state.externalId = options.externalId; return; }
          if (method === 'logout') { state.optedIn = false; state.externalId = null; return; }
          if (method === 'requestPermission') { state.prompts++; state.permission = true; return { granted: true }; }
          if (method === 'setEnabled') { state.optedIn = !!options.enabled && state.permission; return { permission: state.permission, optedIn: state.optedIn }; }
        },
      } });
    }, user);
    const saved = [];
    await page.route('https://*.supabase.co/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      let json: unknown = [];
      if (path.endsWith('/user')) json = user;
      if (path.endsWith('/profiles')) json = { username: 'fixture', user_type: 'viewer' };
      if (path.endsWith('/notification_preferences')) {
        if (request.method() === 'POST') saved.push(request.postDataJSON());
        json = { user_id: user.id, likes_enabled: true, comments_enabled: true, replies_enabled: true, follows_enabled: true, new_videos_enabled: true, sound_enabled: true, push_enabled: false };
      }
      if (path.endsWith('/onesignal-delivery')) return route.fulfill({ status: configured ? 200 : 503, json: configured ? { jwt: 'verified-fixture-jwt', externalId: user.id } : { error: 'Not configured' } });
      return route.fulfill({ json });
    });
    await page.goto('/tests/playback/harness.html?scenario=settings-shared');
    await page.getByRole('button', { name: 'Notifications', exact: true }).and(page.locator('button[aria-expanded]')).click();
    await page.getByRole('button', { name: 'Notification Settings', exact: true }).click();
    const toggle = page.getByRole('switch', { name: 'Push notifications', exact: true });
    await expect(toggle).toBeEnabled();
    await toggle.click();
    const save = page.locator('[role="region"]').filter({ has: toggle }).getByRole('button', { name: 'Save', exact: true });
    await save.click();
    if (configured) {
      await expect.poll(() => saved.length).toBe(1);
      expect(saved[0].push_enabled).toBe(true);
      expect(await page.evaluate(() => window['nativePushTest'])).toMatchObject({ optedIn: true, externalId: user.id, prompts: 1 });
      await expect(save).toBeEnabled();
      await toggle.click(); await save.click();
      await expect.poll(() => saved.length).toBe(2);
      expect(saved[1].push_enabled).toBe(false);
      expect(await page.evaluate(() => window['nativePushTest'])).toMatchObject({ optedIn: false, prompts: 1 });
    } else {
      await expect(toggle).not.toBeChecked();
      expect(saved).toHaveLength(0);
      expect(await page.evaluate(() => window['nativePushTest'])).toMatchObject({ optedIn: false, prompts: 0 });
    }
  });
}
