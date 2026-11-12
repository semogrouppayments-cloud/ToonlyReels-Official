import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

test('audits actual desktop rendition generation', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.route('https://*.supabase.co/**', route => route.fulfill({ json: [] }));
  await page.goto('/tests/playback/harness.html?paused=1');
  await page.locator('body').click(); // Match the upload button's user activation for Web Audio.
  const result = await page.evaluate(async () => {
    const { createToonPlaybackVariants } = await import('/src/lib/toonVariantGenerator.ts');
    const original = await (await fetch('/tests/playback/.media/original.mp4')).blob();
    // Valid MP4 plus trailing padding exercises the existing >35 MiB medium threshold.
    const source = new File([original, new Uint8Array(36 * 1024 * 1024)], 'large-source.mp4', { type: 'video/mp4' });
    const startedAt = performance.now();
    const variants = await createToonPlaybackVariants(source);
    return {
      sourceBytes: source.size,
      elapsedMs: performance.now() - startedAt,
      variants: await Promise.all(variants.map(async variant => {
        const bytes = new Uint8Array(await variant.blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 32768) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
        }
        return { ...variant, blob: undefined, size: variant.blob.size, base64: btoa(binary) };
      })),
    };
  });
  expect(result.variants.map(v => v.key)).toEqual(['low', 'medium']);
  const metadata = [];
  for (const variant of result.variants) {
    const file = testInfo.outputPath(variant.key + '.webm');
    const bytes = Buffer.from(variant.base64, 'base64');
    await writeFile(file, bytes);
    await writeFile(new URL(`./.media/generated-${variant.key}.webm`, import.meta.url), bytes);
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', file], { encoding: 'utf8' }));
    const { base64, ...properties } = variant;
    metadata.push({ ...properties, streams: probe.streams.map(stream => ({
      type: stream.codec_type, codec: stream.codec_name, width: stream.width, height: stream.height,
    })) });
    expect(probe.streams.some(stream => stream.codec_type === 'video')).toBe(true);
    expect(probe.streams.some(stream => stream.codec_type === 'audio')).toBe(true);
    const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 's16le', '-ac', '1', '-'], { maxBuffer: 10 * 1024 * 1024 });
    expect(pcm.some(byte => byte !== 0)).toBe(true);
  }
  await testInfo.attach('generated-rendition-evidence.json', {
    body: JSON.stringify({ sourceBytes: result.sourceBytes, elapsedMs: result.elapsedMs, variants: metadata }, null, 2),
    contentType: 'application/json',
  });
});
