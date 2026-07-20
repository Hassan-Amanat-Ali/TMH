"use client";

import { FormEvent, useState } from "react";
import { Button, Card, Input, Toast } from "@/components/ui";

export function VerificationForm({ currentStatus }: { currentStatus: string }) {
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/verification/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceUrl, note }),
    });
    const data = (await response.json()) as { ok?: boolean; status?: string; error?: string };
    setLoading(false);
    if (!response.ok || !data.ok) {
      setError(data.error || "Unable to submit verification.");
      return;
    }
    setStatus(data.status || "PENDING");
    setMessage("ส่งแล้ว · Your photo verification is waiting for admin review.");
  }

  return (
    <Card className="mx-auto max-w-3xl bg-white p-6 md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">ยืนยันตัวตน · Verify me</p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-burgundy-dark">Photo verification</h1>
      <p className="mt-4 leading-7 text-mauve-dark">Upload or paste a private selfie/photo URL for the admin queue. Use a clear image holding today&apos;s date or your Thai My Heart username.</p>
      <div className="mt-5 rounded-3xl bg-cream-200 p-4 text-sm font-bold text-burgundy">Current status: {status}</div>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        {message && <Toast tone="success">{message}</Toast>}
        {error && <Toast tone="warning">{error}</Toast>}
        <Input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="Photo/selfie URL for review" required />
        <textarea className="min-h-28 rounded-2xl border border-cream-300 bg-cream px-4 py-3 text-sm outline-none focus:border-gold" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the admin reviewer" />
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Submitting..." : "Submit for review"}
        </Button>
      </form>
    </Card>
  );
}
