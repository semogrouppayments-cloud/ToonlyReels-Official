import { test, expect } from '@playwright/test';

// The actual customer clip and encoded renditions are local ignored media files.
// Run this audit only after preparing .media/actual-{original,low,medium,high}.mp4.
test('compares the supplied reel with its real low rendition at 1 Mbps', async ({ page }, testInfo) => {
  await page.route('https://*.supabase.co/**', route => route.fulfill({ json: [] }));
  await page.route('**/__actual-reel/**', route => {
    const file = new URL(route.request().url()).pathname.split('/').pop();
    return route.continue({ url: `http://127.0.0.1:8080/tests/playback/.media/actual-${file}` });
  });
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  const results = [];
  for (const scenario of ['actual-original', 'actual-optimized']) {
    // Load code without throttling, then constrain media after mounting paused.
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await page.goto(`/tests/playback/harness.html?scenario=${scenario}&paused=1`);
    await page.locator('video').waitFor();
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 125_000, uploadThroughput: 125_000 });
    await page.evaluate(() => {
      const video = document.querySelector('video');
      const metrics = { started: performance.now(), firstFrameMs: null, playingMs: null, events: [] };
      Object.assign(window, { actualReelMetrics: metrics });
      video.requestVideoFrameCallback(() => { metrics.firstFrameMs = performance.now() - metrics.started; });
      for (const type of ['loadstart', 'waiting', 'playing', 'stalled', 'error', 'emptied']) {
        video.addEventListener(type, () => {
          metrics.events.push({ type, ms: performance.now() - metrics.started, time: video.currentTime });
          if (type === 'playing' && metrics.playingMs === null) metrics.playingMs = performance.now() - metrics.started;
        });
      }
      window['setAuditActive'](true);
    });
    await page.waitForTimeout(15_000);
    const result = await page.locator('video').evaluate(video => ({
      ...window['actualReelMetrics'],
      src: video.currentSrc, time: video.currentTime, duration: video.duration,
      width: video.videoWidth, height: video.videoHeight, muted: video.muted,
      playedEnd: video.played.length ? video.played.end(video.played.length - 1) : 0,
      audioTracks: video.captureStream().getAudioTracks().length,
      quality: { totalFrames: video.getVideoPlaybackQuality().totalVideoFrames, droppedFrames: video.getVideoPlaybackQuality().droppedVideoFrames },
    }));
    results.push({ scenario, ...result });
    await page.screenshot({ path: testInfo.outputPath(`${scenario}.png`) });
  }
  await testInfo.attach('actual-reel-1mbps.json', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  const [original, low] = results;
  expect(low.src).toContain('/low.mp4');
  expect(low.height).toBe(640);
  expect(low.muted).toBe(false);
  expect(low.audioTracks).toBeGreaterThan(0);
  expect(low.firstFrameMs).not.toBeNull();
  expect(low.firstFrameMs).toBeLessThan(5000);
  expect(low.playedEnd).toBeGreaterThan(original.playedEnd + 3);
  if (original.firstFrameMs !== null) expect(low.firstFrameMs).toBeLessThan(original.firstFrameMs);
});
