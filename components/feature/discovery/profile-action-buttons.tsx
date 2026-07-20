"use client";

import { Bookmark, Heart, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

export function ProfileActionButtons({
  profileId,
  liked,
  favourited,
  compact = false,
}: {
  profileId: string;
  liked: boolean;
  favourited: boolean;
  compact?: boolean;
}) {
  const [isLiked, setIsLiked] = useState(liked);
  const [isFavourite, setIsFavourite] = useState(favourited);
  const [pending, setPending] = useState<string | null>(null);

  async function send(type: "LIKE" | "FAVOURITE" | "WINK") {
    setPending(type);
    if (type === "LIKE") setIsLiked(true);
    if (type === "FAVOURITE") setIsFavourite(true);
    try {
      const response = await fetch(`/api/profiles/${profileId}/interaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        if (type === "LIKE") setIsLiked(liked);
        if (type === "FAVOURITE") setIsFavourite(favourited);
      }
    } finally {
      setPending(null);
    }
  }

  const compactClass = compact ? "h-11 w-11 px-0" : "";
  const lightGhost = compact ? "border-burgundy/15 bg-cream text-burgundy" : "";

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={isLiked ? "gold" : "primary"} className={compactClass} aria-label="Like profile" disabled={pending !== null} onClick={() => send("LIKE")}>
        <Heart className={isLiked ? "fill-current" : ""} size={18} />
        {!compact && (isLiked ? "Liked" : "Like")}
      </Button>
      <Button type="button" variant={isFavourite ? "gold" : "ghost"} className={`${compactClass} ${lightGhost}`} aria-label="Save favourite" disabled={pending !== null} onClick={() => send("FAVOURITE")}>
        <Bookmark className={isFavourite ? "fill-current" : ""} size={18} />
        {!compact && "Favourite"}
      </Button>
      <Button type="button" variant="ghost" className={`${compactClass} ${lightGhost}`} aria-label="Say hello">
        <MessageCircle size={18} />
        {!compact && "Say hello"}
      </Button>
      {!compact && (
        <Button type="button" variant="ghost" disabled={pending !== null} onClick={() => send("WINK")}>
          <Sparkles size={18} />
          Wink
        </Button>
      )}
    </div>
  );
}
