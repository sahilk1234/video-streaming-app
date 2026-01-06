"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function EpisodeForm({ seasonId, onCreated }: { seasonId: string; onCreated?: () => void }) {
  const [episodeNumber, setEpisodeNumber] = useState("1");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [runtime, setRuntime] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        episodeNumber: Number(episodeNumber),
        name,
        description,
        runtimeMins: runtime ? Number(runtime) : null
      })
    });

    if (!response.ok) {
      toast.error("Failed to create episode");
      return;
    }

    toast.success("Episode created");
    setName("");
    setDescription("");
    setRuntime("");
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Episode #</Label>
          <Input value={episodeNumber} onChange={(event) => setEpisodeNumber(event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Episode name</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Runtime (mins)</Label>
        <Input value={runtime} onChange={(event) => setRuntime(event.target.value)} />
      </div>
      <Button type="submit">Add episode</Button>
    </form>
  );
}
