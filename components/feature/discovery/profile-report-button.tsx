"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { Button, Modal, Toast } from "@/components/ui";

const categories = [
  ["FAKE_PROFILE", "Fake profile"],
  ["SCAM", "Scam or money request"],
  ["HARASSMENT", "Harassment"],
  ["EXPLICIT_CONTENT", "Explicit content"],
  ["UNDERAGE", "Underage concern"],
  ["SPAM", "Spam"],
  ["OTHER", "Other"],
];

export function ProfileReportButton({ profileId, profileName }: { profileId: string; profileName: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("FAKE_PROFILE");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  async function submit() {
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/profiles/${profileId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, note }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not report profile.");
      setNote("");
      setNotice({ tone: "success", text: "Report submitted. Our moderation team will review this profile." });
    } catch (error) {
      setNotice({ tone: "warning", text: error instanceof Error ? error.message : "Could not report profile." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-danger" onClick={() => setOpen(true)}>
        <Flag size={16} />
        Report profile
      </button>
      <Modal open={open} title={`Report ${profileName}`} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          {notice && <Toast tone={notice.tone}>{notice.text}</Toast>}
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-11 w-full rounded-2xl border border-cream-300 bg-white px-4 text-sm font-bold text-burgundy outline-none focus:border-gold"
          >
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 1000))}
            className="min-h-28 w-full resize-none rounded-2xl border border-cream-300 bg-white px-4 py-3 text-sm outline-none focus:border-gold"
            placeholder="Optional note for moderators..."
          />
          <Button type="button" variant="primary" className="w-full" disabled={pending} onClick={submit}>
            {pending ? "Submitting..." : "Submit report"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
