package com.semogroup.toonlyreels;

import android.media.MediaMetadataRetriever;
import android.annotation.SuppressLint;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.effect.Presentation;
import androidx.media3.transformer.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Scoped-cache, hardware-assisted compression. No storage permission or arbitrary file access. */
@SuppressLint("UnsafeOptInUsageError")
@CapacitorPlugin(name = "ReelCompressor")
public class ReelCompressorPlugin extends Plugin {
    private static final long MAX_BYTES = 250L * 1024 * 1024;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private static class Job {
        String id;
        File input, output;
        long expected;
        boolean hadAudio;
        Transformer transformer;
        PluginCall pending;
        Runnable poll, timeout;
    }

    @PluginMethod public void begin(PluginCall call) {
        io.execute(() -> {
            try {
                Long bytes = call.getLong("bytes");
                if (bytes == null || bytes <= 0 || bytes > MAX_BYTES) throw new Exception("Invalid video size");
                if (!jobs.isEmpty()) throw new Exception("Another video is being prepared");
                File dir = new File(getContext().getCacheDir(), "reel-compression");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("Cannot create temporary video files");
                File[] stale = dir.listFiles();
                if (stale != null) for (File file : stale) if (file.lastModified() < System.currentTimeMillis() - 86400000L) file.delete();
                if (dir.getUsableSpace() < bytes * 2 + 32L * 1024 * 1024) throw new Exception("Not enough space to compress video");
                Job job = new Job(); job.id = UUID.randomUUID().toString(); job.expected = bytes;
                job.input = new File(dir, job.id + ".input"); job.output = new File(dir, job.id + ".mp4");
                if (!job.input.createNewFile()) throw new Exception("Cannot prepare video");
                jobs.put(job.id, job);
                JSObject result = new JSObject(); result.put("id", job.id); call.resolve(result);
            } catch (Exception error) { call.reject(error.getMessage(), error); }
        });
    }

    @PluginMethod public void append(PluginCall call) {
        io.execute(() -> {
            try {
                Job job = jobs.get(call.getString("id", ""));
                String encoded = call.getString("data");
                if (job == null || job.transformer != null || encoded == null || encoded.length() > 710000) throw new Exception("Invalid video chunk");
                byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                if (bytes.length > 512 * 1024 || job.input.length() + bytes.length > job.expected) throw new Exception("Video chunk exceeds input size");
                try (FileOutputStream output = new FileOutputStream(job.input, true)) { output.write(bytes); }
                call.resolve();
            } catch (Exception error) { call.reject(error.getMessage(), error); }
        });
    }

    @PluginMethod public void compress(PluginCall call) {
        io.execute(() -> {
            Job job = jobs.get(call.getString("id", ""));
            if (job == null || job.input.length() != job.expected) { call.reject("Incomplete video"); return; }
            MediaMetadataRetriever metadata = new MediaMetadataRetriever();
            try {
                metadata.setDataSource(job.input.getAbsolutePath());
                int height = Integer.parseInt(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
                int width = Integer.parseInt(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));
                int rotation = Integer.parseInt(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));
                job.hadAudio = "yes".equals(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO));
                long durationMs = Long.parseLong(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));
                if (rotation == 90 || rotation == 270) height = width;
                if (durationMs <= 0) throw new Exception("Invalid duration");
                if (durationMs > 121000) throw new Exception("Video exceeds two minutes");
                if (job.expected * 8000.0 / durationMs <= 1000000 && height <= 854) {
                    JSObject result = new JSObject(); result.put("skipped", true); call.resolve(result); return;
                }
                int targetHeight = Math.min(height, 854); targetHeight -= targetHeight % 2;
                final int outputHeight = targetHeight;
                main.post(() -> startExport(job, outputHeight, call));
            } catch (Exception error) { call.reject("This device could not prepare the video", error); }
            finally { try { metadata.release(); } catch (Exception ignored) {} }
        });
    }

    private void startExport(Job job, int height, PluginCall call) {
        if (jobs.get(job.id) != job) { call.reject("Compression cancelled"); return; }
        try {
            job.pending = call;
            DefaultEncoderFactory encoders = new DefaultEncoderFactory.Builder(getContext())
                .setEnableFallback(true)
                .setRequestedVideoEncoderSettings(new VideoEncoderSettings.Builder().setBitrate(750000).setiFrameIntervalSeconds(2f).build())
                .setRequestedAudioEncoderSettings(new AudioEncoderSettings.Builder().setBitrate(80000).build()).build();
            EditedMediaItem media = new EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(job.input)))
                .setEffects(new Effects(Collections.emptyList(), Collections.singletonList(Presentation.createForHeight(height))))
                .build();
            job.transformer = new Transformer.Builder(getContext())
                .setVideoMimeType(MimeTypes.VIDEO_H264).setAudioMimeType(MimeTypes.AUDIO_AAC)
                .setEncoderFactory(encoders)
                // In-app MP4 muxer attempts a front-loaded index for progressive playback.
                .setMuxerFactory(new InAppMp4Muxer.Factory())
                .addListener(new Transformer.Listener() {
                    @Override public void onCompleted(Composition composition, ExportResult result) {
                        stopTimers(job); job.pending = null;
                        if (job.hadAudio && (result.channelCount <= 0 || !MimeTypes.AUDIO_AAC.equals(result.audioMimeType))) {
                            call.reject("Audio could not be preserved; keeping the original video"); return;
                        }
                        JSObject response = new JSObject();
                        response.put("uri", Uri.fromFile(job.output).toString());
                        response.put("bytes", job.output.length()); call.resolve(response);
                    }
                    @Override public void onError(Composition composition, ExportResult result, ExportException error) {
                        stopTimers(job); job.pending = null; call.reject("This device could not compress the video", error);
                    }
                }).build();
            job.transformer.start(media, job.output.getAbsolutePath());
            job.poll = new Runnable() {
                @Override public void run() {
                    if (job.pending == null) return;
                    ProgressHolder progress = new ProgressHolder();
                    if (job.transformer.getProgress(progress) == Transformer.PROGRESS_STATE_AVAILABLE) {
                        JSObject update = new JSObject(); update.put("id", job.id); update.put("percent", progress.progress);
                        notifyListeners("progress", update);
                    }
                    main.postDelayed(this, 500);
                }
            };
            main.post(job.poll);
            job.timeout = () -> { if (job.pending != null) { job.transformer.cancel(); job.pending = null; stopTimers(job); call.reject("Video preparation timed out"); } };
            main.postDelayed(job.timeout, 300000);
        } catch (Exception error) { stopTimers(job); job.pending = null; call.reject("This device could not start video compression", error); }
    }

    private void stopTimers(Job job) {
        if (job.poll != null) main.removeCallbacks(job.poll);
        if (job.timeout != null) main.removeCallbacks(job.timeout);
    }

    @PluginMethod public void release(PluginCall call) {
        Job job = jobs.remove(call.getString("id", ""));
        main.post(() -> {
            if (job != null) {
                stopTimers(job);
                if (job.transformer != null) job.transformer.cancel();
                if (job.pending != null) { job.pending.reject("Compression cancelled"); job.pending = null; }
                io.execute(() -> { job.input.delete(); job.output.delete(); call.resolve(); });
            } else call.resolve();
        });
    }

    @Override protected void handleOnDestroy() {
        for (Job job : jobs.values()) {
            stopTimers(job);
            if (job.transformer != null) job.transformer.cancel();
            if (job.pending != null) job.pending.reject("Compression cancelled");
            job.input.delete(); job.output.delete();
        }
        jobs.clear(); io.shutdown();
    }
}
