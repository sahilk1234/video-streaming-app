"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SeasonForm({ titleId, onCreated }: { titleId: string; onCreated?: () => void }) {
  const [seasonNumber, setSeasonNumber] = useState("1");
  const [name, setName] = useState("Season 1");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleId,
        seasonNumber: Number(seasonNumber),
        name
      })
    });

    if (!response.ok) {
      toast.error("Failed to create season");
      return;
    }

    toast.success("Season created");
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label>Season #</Label>
        <Input value={seasonNumber} onChange={(event) => setSeasonNumber(event.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Season name</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="md:col-span-3">
        <Button type="submit">Add season</Button>
      </div>
    </form>
  );
}
