export interface GeneratedToonVariant {
  key: 'low' | 'medium';
  blob: Blob;
  width: number;
  height: number;
  bitrate: number;
  mimeType: string;
}

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

export const canCreateToonPlaybackVariants = () => {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas') as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
  const isTouchDevice = navigator.maxTouchPoints > 0 || window.innerWidth <= 1024;

  return Boolean(
    !isTouchDevice &&
    typeof MediaRecorder !== 'undefined' &&
    typeof canvas.captureStream === 'function' &&
    getSupportedMimeType()
  );
};

const waitForEvent = (target: EventTarget, eventName: string) =>
  new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, 10000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      target.removeEventListener(eventName, handleEvent);
      target.removeEventListener('error', handleError);
    };

    const handleEvent = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Video ${eventName} failed`));
    };

    target.addEventListener(eventName, handleEvent, { once: true });
    target.addEventListener('error', handleError, { once: true });
  });

const renderVariant = async (
  sourceFile: File,
  key: GeneratedToonVariant['key'],
  targetLongEdge: number,
  bitrate: number,
): Promise<GeneratedToonVariant | null> => {
  const mimeType = getSupportedMimeType();
  if (!mimeType) return null;

  const sourceUrl = URL.createObjectURL(sourceFile);
  const video = document.createElement('video');
  const canvas = document.createElement('canvas') as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
  const context = canvas.getContext('2d', { alpha: false });

  if (!context || !canvas.captureStream) {
    URL.revokeObjectURL(sourceUrl);
    return null;
  }

  video.src = sourceUrl;
  // Route decoded audio into the recording, not the speakers.
  video.muted = false;
  video.playsInline = true;
  video.preload = 'metadata';

  let audioContext: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let frameId = 0;

  try {
    await waitForEvent(video, 'loadedmetadata');

    const sourceWidth = video.videoWidth || 720;
    const sourceHeight = video.videoHeight || 1280;
    const scale = Math.min(1, targetLongEdge / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(2, Math.round((sourceWidth * scale) / 2) * 2);
    const height = Math.max(2, Math.round((sourceHeight * scale) / 2) * 2);

    canvas.width = width;
    canvas.height = height;

    stream = canvas.captureStream(24);
    // Canvas capture is video-only. Preserve the source audio through Web Audio.
    // If this browser cannot record audio, retain the original rather than publish a silent rendition.
    if (!window.AudioContext) return null;
    audioContext = new AudioContext();
    const audioSource = audioContext.createMediaElementSource(video);
    const audioDestination = audioContext.createMediaStreamDestination();
    audioSource.connect(audioDestination);
    const audioTrack = audioDestination.stream.getAudioTracks()[0];
    if (!audioTrack) return null;
    stream.addTrack(audioTrack);
    await audioContext.resume();
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const stopped = new Promise<void>((resolve, reject) => {
      recorder!.onstop = () => resolve();
      recorder!.onerror = () => reject(new Error('Variant recorder failed'));
    });

    const draw = () => {
      if (video.paused || video.ended) return;
      context.drawImage(video, 0, 0, width, height);
      frameId = window.requestAnimationFrame(draw);
    };

    video.currentTime = 0;
    recorder.start(1000);
    await video.play();
    draw();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });

    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;

    stream.getTracks().forEach((track) => track.stop());

    const blob = new Blob(chunks, { type: mimeType.split(';')[0] || 'video/webm' });
    if (blob.size === 0 || blob.size >= sourceFile.size * 0.92) return null;

    return {
      key,
      blob,
      width,
      height,
      bitrate,
      mimeType: blob.type || 'video/webm',
    };
  } finally {
    window.cancelAnimationFrame(frameId);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    stream?.getTracks().forEach(track => track.stop());
    if (audioContext && audioContext.state !== 'closed') await audioContext.close();
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(sourceUrl);
  }
};

export const createToonPlaybackVariants = async (sourceFile: File): Promise<GeneratedToonVariant[]> => {
  if (!canCreateToonPlaybackVariants()) return [];

  const variants: GeneratedToonVariant[] = [];
  const low = await renderVariant(sourceFile, 'low', 640, 520_000);
  if (low) variants.push(low);

  if (sourceFile.size > 35 * 1024 * 1024) {
    const medium = await renderVariant(sourceFile, 'medium', 854, 900_000);
    if (medium) variants.push(medium);
  }

  return variants;
};
