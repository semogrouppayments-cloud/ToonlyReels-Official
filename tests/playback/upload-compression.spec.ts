import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const media = path.resolve('tests/playback/.media');
const sourceBytes = fs.statSync(path.join(media, 'upload-input.mp4')).size;
const compressedBytes = fs.statSync(path.join(media, 'medium.mp4')).size;

for (const failEncoder of [false, true]) {
  test(failEncoder ? 'uploads original when native conversion fails and cleans temporary files' : 'waits for compression and uploads the smaller MP4 with correct metadata', async ({ page }) => {
    const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {} };
    await page.addInitScript(({ user, failEncoder, compressedBytes }) => {
      localStorage.setItem('sb-vxenlskelqwpghclxbjj-auth-token', JSON.stringify({ access_token: 'fixture-token', refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
      const state = { copied: 0, maxChunk: 0, released: 0, listenerRemoved: 0, encoderStarted: false, uploadFiles: [] };
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        if (String(input).includes('/storage/v1/object/') && String(input).endsWith('.mp4') && init?.body instanceof FormData) {
          for (const value of init.body.values()) if (value instanceof File) state.uploadFiles.push({ bytes: value.size, type: value.type });
        }
        return originalFetch(input, init);
      };
      Object.assign(window, { compressionTest: state, androidBridge: {} });
      let finish: () => void;
      const gate = new Promise<void>(resolve => { finish = resolve; });
      Object.assign(window, { finishMockCompression: () => finish() });
      Object.assign(window, { Capacitor: {
        PluginHeaders: [{ name: 'ReelCompressor', methods: ['begin', 'append', 'compress', 'release', 'removeListener'].map(name => ({ name, rtype: 'promise' })).concat([{ name: 'addListener', rtype: 'callback' }]) }],
        nativeCallback: async () => 'mock-listener',
        nativePromise: async (_plugin: string, method: string, options: { data?: string }) => {
          if (method === 'begin') return { id: 'mock-job' };
          if (method === 'append') { const size = atob(options.data).length; state.copied += size; state.maxChunk = Math.max(state.maxChunk, size); return; }
          if (method === 'release') { state.released++; return; }
          if (method === 'removeListener') { state.listenerRemoved++; return; }
          if (method === 'compress') {
            state.encoderStarted = true; await gate;
            if (failEncoder) throw new Error('Hardware encoder unavailable');
            return { uri: 'http://127.0.0.1:8080/tests/playback/.media/medium.mp4', bytes: compressedBytes };
          }
        },
      } });
    }, { user, failEncoder, compressedBytes });
    const uploads: { bytes: number; type: string; url: string }[] = [];
    let record;
    await page.route('https://*.supabase.co/**', async route => {
      const request = route.request(); const url = new URL(request.url());
      let json: unknown = [];
      if (url.pathname.endsWith('/user')) json = user;
      if (url.pathname.includes('/storage/v1/object/')) {
        if (url.pathname.endsWith('.mp4')) uploads.push({ bytes: request.postDataBuffer()?.length || 0, type: request.headers()['content-type'], url: request.url() });
        json = { Key: 'videos/fixture.mp4', Id: 'fixture' };
      }
      if (url.pathname.endsWith('/videos') && request.method() === 'POST') { record = request.postDataJSON(); json = { id: '22222222-2222-4222-8222-222222222222' }; }
      await route.fulfill({ json });
    });
    await page.goto('/tests/playback/harness.html?scenario=upload-compression');
    await page.locator('#title').fill('Compression test');
    await page.locator('#video').setInputFiles(path.join(media, 'upload-input.mp4'));
    await page.getByRole('button', { name: 'Upload Animation', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window['compressionTest'].encoderStarted)).toBe(true);
    await expect(page.getByRole('status')).toContainText('Preparing smaller video');
    expect(uploads).toHaveLength(0);
    await page.evaluate(() => window['finishMockCompression']());
    await expect.poll(() => uploads.length).toBe(1);
    await expect.poll(() => record?.video_url).toBeTruthy();
    const bridge = await page.evaluate(() => window['compressionTest']);
    expect(bridge.copied).toBe(sourceBytes);
    expect(bridge.maxChunk).toBeLessThanOrEqual(256 * 1024);
    expect(bridge.released).toBe(1);
    expect(bridge.listenerRemoved).toBe(1);
    const expectedBytes = failEncoder ? sourceBytes : compressedBytes;
    // Chromium's request inspector omits disk-backed file bytes; inspect the actual FormData File.
    expect(bridge.uploadFiles).toEqual([{ bytes: expectedBytes, type: 'video/mp4' }]);
    expect(record.video_url).toContain('.mp4');
    if (!failEncoder) expect(bridge.uploadFiles[0].bytes).toBeLessThan(sourceBytes * 0.9);
  });
}

test('rejects a larger encoder result and keeps the original without fetching it', async ({ page }) => {
  await page.goto('/tests/playback/harness.html?paused=1');
  const result = await page.evaluate(async () => {
    const { compressWithNative } = await import('/src/lib/uploadCompression.ts');
    const file = new File([new Uint8Array(300000)], 'input.mp4', { type: 'video/mp4' });
    let released = 0, loaded = 0;
    const bridge = { begin: async () => ({ id: 'test' }), append: async () => {}, compress: async () => ({ uri: 'unused', bytes: 400000 }), release: async () => { released++; }, addListener: async () => ({ remove: async () => {} }) };
    const prepared = await compressWithNative(file, () => {}, undefined, bridge, async () => { loaded++; return new Blob(); });
    return { sameFile: prepared.file === file, compressed: prepared.compressed, released, loaded };
  });
  expect(result).toEqual({ sameFile: true, compressed: false, released: 1, loaded: 0 });
});


test('cancels an in-flight conversion without returning an upload file', async ({ page }) => {
  await page.goto('/tests/playback/harness.html?paused=1');
  const result = await page.evaluate(async () => {
    const { compressWithNative } = await import('/src/lib/uploadCompression.ts');
    const controller = new AbortController(); let rejected, released = 0, removed = false;
    const bridge = {
      begin: async () => ({ id: 'cancel-test' }), append: async () => {},
      compress: async () => new Promise((_resolve, reject) => { rejected = reject; setTimeout(() => controller.abort(), 0); }),
      release: async () => { released++; rejected?.(new DOMException('Cancelled', 'AbortError')); },
      addListener: async () => ({ remove: async () => { removed = true; } }),
    };
    try { await compressWithNative(new File(['abc'], 'input.mp4'), () => {}, controller.signal, bridge); return { cancelled: false }; }
    catch (error) { return { cancelled: error.name === 'AbortError', released: released > 0, removed }; }
  });
  expect(result).toEqual({ cancelled: true, released: true, removed: true });
});
