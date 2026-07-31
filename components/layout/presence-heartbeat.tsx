"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_INTERVAL_MS = 60_000;
const MIN_HEARTBEAT_GAP_MS = 45_000;

export function PresenceHeartbeat() {
  const { status } = useSession();
  const lastSentAtRef = useRef(0);

  const ping = useCallback((force = false) => {
    if (status !== "authenticated" || document.hidden) return;
    const now = Date.now();
    if (!force && now - lastSentAtRef.current < MIN_HEARTBEAT_GAP_MS) return;
    lastSentAtRef.current = now;
    void fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => undefined);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    ping(true);
    const interval = window.setInterval(() => ping(), HEARTBEAT_INTERVAL_MS);
    const handleFocus = () => ping();
    const handleVisibility = () => {
      if (!document.hidden) ping(true);
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [ping, status]);

  return null;
}
