import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface NativeReelCompressor {
  begin(options: { bytes: number }): Promise<{ id: string }>;
  append(options: { id: string; data: string }): Promise<void>;
  compress(options: { id: string }): Promise<{ uri?: string; bytes?: number; skipped?: boolean }>;
  release(options: { id: string }): Promise<void>;
  addListener(name: 'progress', callback: (event: { id: string; percent: number }) => void): Promise<PluginListenerHandle>;
}
const native = registerPlugin<NativeReelCompressor>('ReelCompressor');
const CHUNK_BYTES = 256 * 1024;
export type PreparedUpload = { file: File; compressed: boolean; reason?: 'already-small' | 'unavailable' | 'not-smaller' | 'failed' };

const readChunk = (chunk: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read video'));
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.readAsDataURL(chunk);
});

/** Kept separate from device detection so the bridge contract can be tested in Chromium. */
export async function compressWithNative(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
  bridge: NativeReelCompressor = native,
  load: (uri: string) => Promise<Blob> = async uri => {
    const response = await fetch(Capacitor.convertFileSrc(uri));
    if (!response.ok) throw new Error('Could not read prepared video');
    return response.blob();
  },
): Promise<PreparedUpload> {
  let id: string | undefined;
  let listener: PluginListenerHandle | undefined;
  const checkCancelled = () => { if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError'); };
  const abort = () => { if (id) void bridge.release({ id }).catch(() => {}); };
  try {
    checkCancelled();
    ({ id } = await bridge.begin({ bytes: file.size }));
    signal?.addEventListener('abort', abort, { once: true });
    checkCancelled();
    listener = await bridge.addListener('progress', event => {
      if (event.id === id) onProgress(Math.round(10 + Math.max(0, Math.min(100, event.percent)) * 0.85));
    });
    // Never base64-encode the entire input: the bridge gets one bounded chunk at a time.
    for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) {
      checkCancelled();
      const data = await readChunk(file.slice(offset, offset + CHUNK_BYTES));
      checkCancelled();
      await bridge.append({ id, data });
      onProgress(Math.min(10, Math.round((offset + CHUNK_BYTES) / file.size * 10)));
    }
    checkCancelled();
    const output = await bridge.compress({ id });
    checkCancelled();
    if (output.skipped) return { file, compressed: false, reason: 'already-small' };
    if (!output.uri || !output.bytes || output.bytes >= file.size * 0.9) return { file, compressed: false, reason: 'not-smaller' };
    const blob = await load(output.uri);
    checkCancelled();
    if (blob.size === 0 || blob.size >= file.size * 0.9) return { file, compressed: false, reason: 'not-smaller' };
    onProgress(100);
    return { file: new File([blob], file.name.replace(/\.[^.]+$/, '') + '.mp4', { type: 'video/mp4', lastModified: file.lastModified }), compressed: true };
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
    console.warn('On-device compression unavailable; keeping original upload', error);
    return { file, compressed: false, reason: 'failed' };
  } finally {
    signal?.removeEventListener('abort', abort);
    await listener?.remove().catch(() => {});
    if (id) await bridge.release({ id }).catch(() => {});
  }
}

export async function prepareUploadVideo(file: File, onProgress: (percent: number) => void, signal?: AbortSignal): Promise<PreparedUpload> {
  if (file.size < 8 * 1024 * 1024) return { file, compressed: false, reason: 'already-small' };
  if (Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('ReelCompressor')) {
    return { file, compressed: false, reason: 'unavailable' };
  }
  return compressWithNative(file, onProgress, signal);
}
