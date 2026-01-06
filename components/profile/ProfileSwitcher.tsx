"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/useProfileStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProfileSummary = {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
};

export default function ProfileSwitcher({
  profiles,
  currentProfileId
}: {
  profiles: ProfileSummary[];
  currentProfileId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const setProfileId = useProfileStore((state) => state.setProfileId);

  const current = profiles.find((profile) => profile.id === currentProfileId) || profiles[0];

  const selectProfile = async (profileId: string) => {
    await fetch("/api/profiles/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId })
    });
    setProfileId(profileId);
    setOpen(false);
    router.refresh();
    router.push("/home");
  };

  if (!current) {
    return null;
  }

  return (
    <div className="relative">
      <Button variant="ghost" className="flex items-center gap-2" onClick={() => setOpen((prev) => !prev)}>
        <span className="text-lg">{current.avatar}</span>
        <span className="text-sm font-medium">{current.name}</span>
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-border bg-surface/95 p-2 shadow-xl">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => selectProfile(profile.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface/70",
                profile.id === currentProfileId && "bg-surface/80"
              )}
            >
              <span className="text-lg">{profile.avatar}</span>
              <span>{profile.name}</span>
              {profile.isKids && <span className="ml-auto text-xs text-muted">Kids</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
