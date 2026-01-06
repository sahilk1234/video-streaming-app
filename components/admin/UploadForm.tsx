"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function UploadForm({
  titleId,
  episodeId,
  onUploaded
}: {
  titleId?: string;
  episodeId?: string;
  onUploaded?: () => void;
}) {
  const [video, setVideo] = useState<File | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [backdrop, setBackdrop] = useState<File | null>(null);
  const [subtitle, setSubtitle] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!video && !poster && !backdrop && !subtitle) {
      toast.error("Add at least one file");
      return;
    }

    const formData = new FormData();
    if (titleId) {
      formData.append("titleId", titleId);
    }
    if (episodeId) {
      formData.append("episodeId", episodeId);
    }
    if (video) formData.append("video", video);
    if (poster) formData.append("poster", poster);
    if (backdrop) formData.append("backdrop", backdrop);
    if (subtitle) formData.append("subtitle", subtitle);

    setLoading(true);
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData
    });
    setLoading(false);

    if (!response.ok) {
      toast.error("Upload failed");
      return;
    }

    const data = await response.json();
    if (data.jobId) {
      toast.success("Upload started. Processing media...");
    } else {
      toast.success("Upload complete");
    }
    setVideo(null);
    setPoster(null);
    setBackdrop(null);
    setSubtitle(null);
    onUploaded?.();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Video (MP4)</Label>
          <input
            type="file"
            accept="video/mp4"
            onChange={(event) => setVideo(event.target.files?.[0] || null)}
            className="w-full text-sm text-muted"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle (VTT)</Label>
          <input
            type="file"
            accept="text/vtt"
            onChange={(event) => setSubtitle(event.target.files?.[0] || null)}
            className="w-full text-sm text-muted"
          />
        </div>
        {titleId && (
          <>
            <div className="space-y-2">
              <Label>Poster</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setPoster(event.target.files?.[0] || null)}
                className="w-full text-sm text-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Backdrop</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setBackdrop(event.target.files?.[0] || null)}
                className="w-full text-sm text-muted"
              />
            </div>
          </>
        )}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Uploading..." : "Upload files"}
      </Button>
    </form>
  );
}
