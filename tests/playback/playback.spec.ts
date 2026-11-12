import { test, expect } from '@playwright/test';
import path from 'node:path';


test.beforeEach(async ({ page }) => {
  await page.route('https://*.supabase.co/**', route => route.fulfill({ json: [] }));
  await page.route('**/__playback-fixtures/**', async route => {
    const name = path.basename(new URL(route.request().url()).pathname);
    const scenario = new URL(page.url()).searchParams.get('scenario');
    if (scenario === 'all-missing' || (scenario === 'missing' && name !== 'original.mp4')) {
      return route.fulfill({ status: 404, body: 'Missing rendition' });
    }
    // Use real HTTP range responses, so Chromium network throttling applies to media.
    await route.continue({ url: new URL(`/tests/playback/.media/${name === 'high.mp4' ? 'original.mp4' : name}`, route.request().url()).href });
  });
  await page.addInitScript(() => {
    const audit = { events: [], longTasks: [], errors: [] };
    Object.assign(window, { playbackAudit: audit });
    window.addEventListener('error', e => audit.errors.push(e.message));
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) audit.longTasks.push({ at: entry.startTime, ms: entry.duration });
    }).observe({ entryTypes: ['longtask'] });
    new MutationObserver(() => {
      document.querySelectorAll('video').forEach(video => {
        if (video.dataset.audited) return;
        video.dataset.audited = 'true';
        for (const type of ['loadstart', 'loadedmetadata', 'playing', 'waiting', 'stalled', 'error', 'emptied', 'pause', 'ended']) {
          video.addEventListener(type, () => audit.events.push({
            at: performance.now(), type, src: video.currentSrc || video.getAttribute('src'),
            time: video.currentTime, readyState: video.readyState, networkState: video.networkState,
            error: video.error?.code,
          }));
        }
      });
    }).observe(document, { childList: true, subtree: true });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const evidence = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight, touchPoints: navigator.maxTouchPoints },
    audit: window['playbackAudit'],
    video: [...document.querySelectorAll('video')].map(video => ({
      src: video.currentSrc, time: video.currentTime, paused: video.paused,
      readyState: video.readyState, width: video.videoWidth, height: video.videoHeight,
      played: Array.from({ length: video.played.length }, (_, index) => ({ start: video.played.start(index), end: video.played.end(index) })),
      totalFrames: video.getVideoPlaybackQuality().totalVideoFrames,
      droppedFrames: video.getVideoPlaybackQuality().droppedVideoFrames,
      box: video.getBoundingClientRect().toJSON(),
    })),
    resources: performance.getEntriesByType('resource').filter(r => r.name.includes('__playback-fixtures/'))
      .map(r => ({ name: r.name, duration: r.duration, bytes: r['transferSize'] })),
  }));
  await testInfo.attach('playback-evidence.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('viewport.png') });
});

test('auto plays the real low rendition without changing the reel layout', async ({ page }) => {
  await page.goto('/tests/playback/harness.html');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 12_000 }).toBeGreaterThan(2);
  await expect(video).toHaveJSProperty('videoHeight', 640);
  expect(await video.evaluate(v => v.currentSrc)).toContain('/low.mp4');
  const before = await video.evaluate(v => v.currentTime);
  await page.waitForTimeout(2000);
  expect(await video.evaluate(v => v.currentTime)).toBeGreaterThan(before + 1);
});

test('falls through missing low and medium renditions to the playable original', async ({ page }) => {
  await page.goto('/tests/playback/harness.html?scenario=missing');
  await expect.poll(() => page.locator('video').evaluate(v => v.currentTime), { timeout: 8000 }).toBeGreaterThan(1);
  expect(await page.locator('video').evaluate(v => v.currentSrc)).toContain('/original.mp4');
});

test('plays original-only records and resumes after a reel becomes active again', async ({ page }) => {
  await page.goto('/tests/playback/harness.html?scenario=original-only');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 12_000 }).toBeGreaterThan(1);
  await page.evaluate(() => window['setAuditActive'](false));
  await expect(video).toHaveAttribute('src', /original\.mp4/);
  await expect(video).toHaveJSProperty('paused', true);
  await page.evaluate(() => window['setAuditActive'](true));
  await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 12_000 }).toBeGreaterThan(1);
});

test('documents rendition availability and source selection on touch views', async ({ page }) => {
  await page.goto('/tests/playback/harness.html');
  const result = await page.evaluate(async () => {
    const generator = await import('/src/lib/toonVariantGenerator.ts');
    const playback = await import('/src/lib/toonPlayback.ts');
    const options = { originalUrl: 'original.mp4', saveData: false, isSlowConnection: false, isTouchDevice: true, isStandalonePwa: false };
    return {
      canGenerate: generator.canCreateToonPlaybackVariants(),
      auto: playback.chooseToonPlaybackSource({ ...options, quality: 'auto', variants: { low: 'low.mp4', medium: 'medium.mp4', high: 'high.mp4' } }).url,
      high: playback.chooseToonPlaybackSource({ ...options, quality: 'high', variants: { low: 'low.mp4', medium: 'medium.mp4', high: 'high.mp4' } }).url,
      medium: playback.chooseToonPlaybackSource({ ...options, quality: 'medium', variants: { low: 'low.mp4', medium: 'medium.mp4' } }).url,
      absent: playback.chooseToonPlaybackSource({ ...options, quality: 'auto', variants: {} }).url,
    };
  });
  expect(result).toEqual({ canGenerate: false, auto: 'low.mp4', high: 'high.mp4', medium: 'low.mp4', absent: 'original.mp4' });
});


test('stops after all sources fail instead of cycling indefinitely', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/__playback-fixtures/')) requests.push(path.basename(new URL(request.url()).pathname));
  });
  await page.goto('/tests/playback/harness.html?scenario=all-missing');
  await expect.poll(() => requests.includes('original.mp4')).toBe(true);
  await page.waitForTimeout(2000);
  expect(requests).toEqual(['low.mp4', 'medium.mp4', 'original.mp4']);
});

test('records buffering at 1 Mbps on an original-only record', async ({ page }, testInfo) => {
  await page.goto('/tests/playback/harness.html?scenario=original-only&paused=1');
  await page.locator('video').waitFor();
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: 125_000, uploadThroughput: 125_000,
  });
  await page.evaluate(() => window['setAuditActive'](true));
  await page.waitForTimeout(10_000);
  const result = await page.locator('video').evaluate(v => ({ time: v.currentTime, readyState: v.readyState, src: v.currentSrc }));
  await testInfo.attach('constrained-network.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.src).toContain('original.mp4');
  expect(result.time).toBeLessThan(7);
});


test('plays the low WebM produced by the existing desktop encoder', async ({ page }) => {
  await page.goto('/tests/playback/harness.html?scenario=generated');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 12_000 }).toBeGreaterThan(2);
  expect(await video.evaluate(v => v.currentSrc)).toContain('/generated-low.webm');
  await expect(video).toHaveJSProperty('videoHeight', 640);
});

test('starts active reels with sound and hides native and home controls', async ({ page }) => {
  await page.goto('/tests/playback/harness.html?scenario=high');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 12_000 }).toBeGreaterThan(1);
  await expect(video).toHaveJSProperty('muted', false);
  await expect(video).toHaveJSProperty('controls', false);
  await expect(page.locator('button:has(svg.lucide-settings), button:has(svg.lucide-volume-x), button:has(svg.lucide-volume-2)')).toHaveCount(0);
  await page.evaluate(() => window['setAuditActive'](false));
  await expect(video).toHaveJSProperty('paused', true);
  await page.evaluate(() => window['setAuditActive'](true));
  await expect.poll(() => video.evaluate(v => !v.paused && !v.muted)).toBe(true);
  const box = await video.boundingBox();
  expect(box.height).toBe(page.viewportSize().height);
});

test('plays the smaller low fixture at the same 1 Mbps limit', async ({ page }) => {
  await page.goto('/tests/playback/harness.html?paused=1');
  await page.locator('video').waitFor();
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: 125_000, uploadThroughput: 125_000,
  });
  await page.evaluate(() => window['setAuditActive'](true));
  await page.waitForTimeout(10_000);
  // currentTime wraps to zero when this short reel loops. Measure its played range.
  expect(await page.locator('video').evaluate(v => v.played.length ? v.played.end(v.played.length - 1) : 0)).toBeGreaterThan(7.5);
});


for (const accountType of ['viewer', 'creative']) {
test(`starts Home playback for ${accountType} without content filters or unrelated waits`, async ({ page }, testInfo) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: { user_type: accountType } };
  await page.addInitScript(user => {
    localStorage.setItem('sb-vxenlskelqwpghclxbjj-auth-token', JSON.stringify({ access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }));
  }, user);
  let release: () => void;
  const holdBackground = new Promise<void>(resolve => { release = resolve; });
  const requests: { path: string; at: number }[] = [];
  const started = Date.now();
  await page.route('https://*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, at: Date.now() - started });
    if (['user_roles', 'follows', 'blocks', 'profiles'].some(table => url.pathname.endsWith('/' + table))) await holdBackground;
    let json: unknown = [];
    if (url.pathname.endsWith('/user')) json = user;
    if (url.pathname.endsWith('/content_settings')) throw new Error('Shared feed must not request content filters');
    if (url.pathname.endsWith('/videos')) {
      json = [0, 1].map(index => ({ id: `22222222-2222-4222-8222-22222222222${index}`, video_url: `/__playback-fixtures/low.mp4?reel=${index}`, title: 'Startup test', description: '', creator_id: '33333333-3333-4333-8333-333333333333', likes_count: 0, views_count: 0, tags: [], video_variants: {}, profiles: { username: 'fixture', avatar_url: '', is_verified: false } }));
      if (url.searchParams.get('select') === 'likes_count') json = { likes_count: 0 };
    }
    if (url.pathname.endsWith('/parental_controls')) json = { screen_time_enabled: false, bedtime_enabled: false, school_hours_enabled: false };
    if (url.pathname.endsWith('/profiles')) json = { username: 'fixture', user_type: 'viewer', is_premium: false };
    await route.fulfill({ json, headers: { 'content-range': '0-0/0' } }).catch(() => {});
  });
  try {
    await page.goto('/tests/playback/harness.html?scenario=feed-startup');
    await expect.poll(() => requests.some(request => request.path.endsWith('/videos')), { timeout: 4000 }).toBe(true);
    await expect.poll(() => page.locator('video').first().evaluate(v => !v.paused && v.currentTime > 0), { timeout: 5000 }).toBe(true);
    await expect(page.locator('video').first()).toHaveJSProperty('muted', false);
    expect(requests.some(request => request.path.endsWith('/content_settings'))).toBe(false);
    const bounds = await page.locator('video').first().boundingBox();
    expect(bounds.y).toBeLessThanOrEqual(1);
    const brand = page.getByTestId('reel-brand').first();
    const bubble = await brand.boundingBox();
    expect(bubble.y).toBeGreaterThanOrEqual(10);
    expect(bubble.y).toBeLessThan(20);
    expect(await brand.evaluate(element => getComputedStyle(element).borderRadius)).toBe('9999px');
    if (page.viewportSize().width < 768) {
      const nav = await page.locator('nav').last().boundingBox();
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(nav.y - 20);
      expect(await page.locator('video').first().evaluate(element => getComputedStyle(element).objectFit)).toBe('cover');
    }
    const feed = page.locator('.reel-viewport');
    await feed.evaluate(element => { element.scrollTop = element.clientHeight; });
    await expect.poll(() => page.locator('video').nth(1).evaluate(video => !video.paused && !video.muted && video.currentTime > 0), { timeout: 6000 }).toBe(true);
    await expect(page.locator('video').first()).toHaveJSProperty('paused', true);
    const nextBounds = await page.locator('video').nth(1).boundingBox();
    expect(Math.abs(nextBounds.y)).toBeLessThan(2);

  } finally {
    release();
    await testInfo.attach('startup-request-timeline.json', { body: JSON.stringify(requests, null, 2), contentType: 'application/json' });
  }
});


}

test('keeps buffered data through repeated network stall events', async ({ page }) => {
  await page.goto('/tests/playback/harness.html');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate(element => element.currentTime), { timeout: 10000 }).toBeGreaterThan(1);
  const loadsBefore = await page.evaluate(() => window['playbackAudit'].events.filter(event => event.type === 'loadstart').length);
  await video.evaluate(element => { for (let i = 0; i < 6; i++) element.dispatchEvent(new Event('stalled')); });
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => window['playbackAudit'].events.filter(event => event.type === 'loadstart').length)).toBe(loadsBefore);
  await expect(video).toHaveJSProperty('paused', false);
  await expect(video).toHaveJSProperty('muted', false);
});


test('manual pause uses a play icon without a sound permission message', async ({ page }) => {
  await page.goto('/tests/playback/harness.html');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate(element => element.currentTime)).toBeGreaterThan(0.5);
  await video.click({ position: { x: 120, y: 200 } });
  await expect(video).toHaveJSProperty('paused', true);
  await expect(page.getByText('Play with sound', { exact: true })).toHaveCount(0);
  const play = page.getByRole('button', { name: 'Play reel', exact: true });
  await expect(play.locator('svg.lucide-play')).toBeVisible();
  await play.click();
  await expect.poll(() => video.evaluate(element => !element.paused && !element.muted)).toBe(true);
  await expect(play).toHaveCount(0);
});

test('only a rejected audible autoplay shows the sound permission prompt', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    let blocked = false;
    HTMLMediaElement.prototype.play = function () {
      if (!blocked) { blocked = true; return Promise.reject(new DOMException('User activation required', 'NotAllowedError')); }
      return play.call(this);
    };
  });
  await page.goto('/tests/playback/harness.html');
  await page.getByRole('button', { name: 'Play reel with sound', exact: true }).click();
  const video = page.locator('video');
  await expect.poll(() => video.evaluate(element => !element.paused && !element.muted)).toBe(true);
  await expect(page.getByText('Play with sound', { exact: true })).toHaveCount(0);
  await video.click({ position: { x: 120, y: 200 } });
  await expect(video).toHaveJSProperty('paused', true);
  await expect(page.getByRole('button', { name: 'Play reel', exact: true })).toBeVisible();
  await expect(page.getByText('Play with sound', { exact: true })).toHaveCount(0);
});

test('Settings no longer offers Safety and Content or category selection', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', aud: 'authenticated', app_metadata: {}, user_metadata: {} };
  const paths = [];
  await page.addInitScript(user => localStorage.setItem('sb-vxenlskelqwpghclxbjj-auth-token', JSON.stringify({ access_token: 'fixture', refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user })), user);
  await page.route('https://*.supabase.co/**', route => {
    const pathname = new URL(route.request().url()).pathname; paths.push(pathname);
    const json = pathname.endsWith('/user') ? user : pathname.endsWith('/profiles') ? { username: 'fixture', user_type: 'viewer' } : pathname.includes('/rpc/') ? null : [];
    return route.fulfill({ json });
  });
  await page.goto('/tests/playback/harness.html?scenario=settings-shared');
  await expect(page.getByText('Account & Profile', { exact: true })).toBeVisible();
  await expect(page.getByText('Safety & Content', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Cartoon-Only Mode', { exact: true })).toHaveCount(0);
  expect(paths.some(path => path.endsWith('/content_settings'))).toBe(false);
});
