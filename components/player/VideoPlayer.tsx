"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import toast from "react-hot-toast";

type PlaybackSource = "HLS" | "MP4";

export default function VideoPlayer({
  hlsUrl,
  mp4Url,
  posterUrl,
  subtitleUrl,
  startAt = 0,
  profileId,
  assetId,
  titleId,
  episodeId
}: {
  hlsUrl?: string | null;
  mp4Url?: string | null;
  posterUrl?: string | null;
  subtitleUrl?: string | null;
  startAt?: number;
  profileId: string | null;
  assetId: string;
  titleId?: string | null;
  episodeId?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [activeSource, setActiveSource] = useState<PlaybackSource | null>(null);
  const [qualityOptions, setQualityOptions] = useState<Array<{ index: number; label: string }>>([]);
  const [qualityLevel, setQualityLevel] = useState(-1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playbackStats, setPlaybackStats] = useState<{ resolution?: string; bitrateKbps?: number }>({});

  const retryPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    setErrorMessage(null);
    setIsReady(false);
    setIsBuffering(true);
    video.load();
    video.play().catch(() => {
      // Swallow autoplay errors; user can press play.
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setUsingFallback(false);
    setActiveSource(null);
    setQualityOptions([]);
    setQualityLevel(-1);
    setIsBuffering(false);
    setIsReady(false);
    setErrorMessage(null);
    setPlaybackStats({});

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (hlsUrl) {
      const canPlay = video.canPlayType("application/vnd.apple.mpegurl");
      if (canPlay) {
        video.src = hlsUrl;
        setActiveSource("HLS");
        return;
      }

      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const options = hls.levels
            .map((level, index) => ({ index, height: level.height }))
            .filter((level) => level.height)
            .sort((a, b) => b.height - a.height)
            .map((level) => ({ index: level.index, label: `${level.height}p` }));
          setQualityOptions(options);
          setActiveSource("HLS");
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          const level = hls.levels[data.level];
          if (!level) return;
          const resolution = level.width && level.height
            ? `${level.width}x${level.height}`
            : level.height
              ? `${level.height}p`
              : undefined;
          const bitrateKbps = level.bitrate ? Math.round(level.bitrate / 1000) : undefined;
          setPlaybackStats({ resolution, bitrateKbps });
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && mp4Url) {
            hls.destroy();
            hlsRef.current = null;
            video.src = mp4Url;
            setUsingFallback(true);
            setQualityOptions([]);
            setQualityLevel(-1);
            setActiveSource("MP4");
            return;
          }
          if (data.fatal) {
            setErrorMessage("Unable to load video stream.");
          }
        });
        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      }
    }

    if (mp4Url) {
      video.src = mp4Url;
      setUsingFallback(true);
      setActiveSource("MP4");
    }
  }, [hlsUrl, mp4Url]);

  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = qualityLevel;
  }, [qualityLevel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      if (startAt && video.currentTime < 1) {
        video.currentTime = startAt;
      }
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    return () => video.removeEventListener("loadedmetadata", handleLoaded);
  }, [startAt]);

  const handleLoadedMetadata = () => {
    setIsReady(true);
    const video = videoRef.current;
    if (!video) return;
    if (video.videoWidth && video.videoHeight) {
      setPlaybackStats((prev) => ({
        ...prev,
        resolution: `${video.videoWidth}x${video.videoHeight}`
      }));
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !profileId) return;

    const sendProgress = async () => {
      if (!video.duration || Number.isNaN(video.duration)) {
        return;
      }
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          assetId,
          titleId,
          episodeId,
          positionSeconds: Math.floor(video.currentTime),
          durationSeconds: Math.floor(video.duration)
        })
      });
    };

    const interval = window.setInterval(sendProgress, 5000);
    video.addEventListener("pause", sendProgress);
    video.addEventListener("ended", sendProgress);

    return () => {
      window.clearInterval(interval);
      video.removeEventListener("pause", sendProgress);
      video.removeEventListener("ended", sendProgress);
    };
  }, [profileId, assetId, titleId, episodeId]);

  useEffect(() => {
    if (usingFallback) {
      toast("HLS unavailable, playing MP4 fallback");
    }
  }, [usingFallback]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-border bg-black">
      <video
        ref={videoRef}
        controls
        poster={posterUrl || undefined}
        className="h-full w-full"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => setIsReady(true)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onStalled={() => setIsBuffering(true)}
        onError={() => setErrorMessage("Unable to load video.")}
      >
        {subtitleUrl && (
          <track
            label="English"
            kind="subtitles"
            srcLang="en"
            src={subtitleUrl}
            default
          />
        )}
      </video>
      {(isBuffering || !isReady) && !errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
          Loading video...
        </div>
      )}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 px-6 text-center text-sm text-white">
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={retryPlayback}
            className="rounded-full border border-white/60 px-4 py-2 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}
      {qualityOptions.length > 0 && (
        <div className="absolute bottom-4 right-4">
          <select
            value={qualityLevel.toString()}
            onChange={(event) => setQualityLevel(Number.parseInt(event.target.value, 10))}
            aria-label="Quality"
            className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs text-white backdrop-blur"
          >
            <option value="-1">Auto</option>
            {qualityOptions.map((option) => (
              <option key={option.index} value={option.index}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {activeSource && (
        <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
          {activeSource}
        </div>
      )}
      {(playbackStats.resolution || playbackStats.bitrateKbps) && (
        <div className="absolute left-4 bottom-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
          {playbackStats.resolution && <span>{playbackStats.resolution}</span>}
          {playbackStats.resolution && playbackStats.bitrateKbps && <span> - </span>}
          {playbackStats.bitrateKbps && <span>{playbackStats.bitrateKbps} kbps</span>}
        </div>
      )}
    </div>
  );
}
