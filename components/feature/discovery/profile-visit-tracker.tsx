"use client";

import { useEffect } from "react";

export function ProfileVisitTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    void fetch(`/api/profiles/${profileId}/visit`, { method: "POST" });
  }, [profileId]);

  return null;
}
