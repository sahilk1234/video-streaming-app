"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/useProfileStore";

export type ProfileCardData = {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
};

export default function ProfileCard({ profile }: { profile: ProfileCardData }) {
  const router = useRouter();
  const setProfileId = useProfileStore((state) => state.setProfileId);

  const selectProfile = async () => {
    await fetch("/api/profiles/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id })
    });
    setProfileId(profile.id);
    router.push("/home");
  };

  return (
    <button
      onClick={selectProfile}
      className={cn(
        "group flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface/70 px-6 py-8 transition hover:-translate-y-1 hover:bg-surface/90",
        profile.isKids && "border-accent/40"
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-background text-4xl">
        {profile.avatar}
      </div>
      <div className="text-lg font-semibold text-text">{profile.name}</div>
      {profile.isKids && <div className="text-xs uppercase text-accent">Kids</div>}
    </button>
  );
}
