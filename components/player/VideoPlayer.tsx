"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import toast from "react-hot-toast";

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
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsUrl) {
      const canPlay = video.canPlayType("application/vnd.apple.mpegurl");
      if (canPlay) {
        video.src = hlsUrl;
        return;
      }

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && mp4Url) {
            hls.destroy();
            video.src = mp4Url;
            setUsingFallback(true);
          }
        });
        return () => hls.destroy();
      }
    }

    if (mp4Url) {
      video.src = mp4Url;
      setUsingFallback(true);
    }
  }, [hlsUrl, mp4Url]);

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
    </div>
  );
}
