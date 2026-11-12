import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('./.media/', import.meta.url));
mkdirSync(directory, { recursive: true });
const original = directory + 'original.mp4';
const ffmpeg = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
if (!existsSync(original)) ffmpeg([
  '-f', 'lavfi', '-i', 'testsrc2=size=720x1280:rate=24',
  '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
  '-t', '8', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', original,
]);
for (const [name, scale, crf] of [['low', '360:640', '30'], ['medium', '480:854', '28']]) {
  const target = directory + name + '.mp4';
  if (!existsSync(target)) ffmpeg([
    '-i', original, '-vf', 'scale=' + scale, '-c:v', 'libx264',
    '-preset', 'ultrafast', '-crf', crf, '-c:a', 'aac', '-movflags', '+faststart', target,
  ]);
}

// Valid synthetic MP4 with trailing padding exercises the native compression size gate.
if (!existsSync(directory + "upload-input.mp4")) writeFileSync(directory + "upload-input.mp4", Buffer.concat([readFileSync(original), Buffer.alloc(9 * 1024 * 1024)]));
