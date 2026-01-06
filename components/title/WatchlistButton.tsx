"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

export default function WatchlistButton({
  titleId,
  profileId,
  initialState
}: {
  titleId: string;
  profileId: string | null;
  initialState?: boolean;
}) {
  const [isInList, setIsInList] = useState(initialState ?? false);

  const toggle = async () => {
    if (!profileId) {
      toast.error("Select a profile first");
      return;
    }

    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, titleId })
    });

    if (!response.ok) {
      toast.error("Unable to update list");
      return;
    }

    const data = await response.json();
    setIsInList(data.added);
    toast.success(data.added ? "Added to My List" : "Removed from My List");
  };

  return (
    <Button variant={isInList ? "secondary" : "outline"} onClick={toggle} className="w-full">
      {isInList ? "In My List" : "Add to My List"}
    </Button>
  );
}
