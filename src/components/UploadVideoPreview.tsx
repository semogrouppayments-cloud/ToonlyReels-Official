import { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

export default function UploadVideoPreview({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return <div className="relative h-40 rounded-lg overflow-hidden bg-black" onClick={event => { event.preventDefault(); event.stopPropagation(); }}>
    <video ref={ref} src={src} playsInline controls={false} preload="metadata"
      poster="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
      className="h-full max-w-full object-contain" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    <button type="button" aria-label={playing ? 'Pause preview' : 'Play preview'}
      className="absolute bottom-2 left-2 rounded-full bg-black/70 p-2 text-white"
      onClick={() => { const video = ref.current; if (!video) return; if (video.paused) void video.play().catch(() => setPlaying(false)); else video.pause(); }}>
      {playing ? <Pause size={20} /> : <Play size={20} />}
    </button>
  </div>;
}
