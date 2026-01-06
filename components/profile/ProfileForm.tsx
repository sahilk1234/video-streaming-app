"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const avatars = ["AX", "NV", "ST", "LX", "TR", "NX", "GD", "RK"];

export default function ProfileForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(avatars[0]);
  const [isKids, setIsKids] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, avatar, isKids })
    });

    if (!response.ok) {
      toast.error("Unable to create profile");
      return;
    }

    toast.success("Profile created");
    setName("");
    if (onCreated) {
      onCreated();
    } else {
      window.location.reload();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Avatar</Label>
        <div className="flex flex-wrap gap-2">
          {avatars.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setAvatar(option)}
              className={`rounded-2xl border px-4 py-3 text-2xl ${
                avatar === option ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={isKids}
          onChange={(event) => setIsKids(event.target.checked)}
        />
        Kids profile
      </label>
      <Button type="submit">Create profile</Button>
    </form>
  );
}
