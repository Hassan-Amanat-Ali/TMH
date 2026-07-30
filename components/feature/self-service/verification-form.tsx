"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Button, Card, Toast } from "@/components/ui";
import { uploadMediaFile } from "@/lib/client/media-upload";

export function VerificationForm({ currentStatus }: { currentStatus: string }) {
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function selectEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setError("");
    setMessage("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, WEBP, or GIF selfie/photo.");
      return;
    }
    setEvidenceFile(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!evidenceFile) {
      setError("Choose a selfie/photo for review.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const evidenceUrl = await uploadMediaFile(evidenceFile, "verification");
      const response = await fetch("/api/verification/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenceUrl, note }),
      });
      const data = (await response.json()) as { ok?: boolean; status?: string; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to submit verification.");
      }
      setStatus(data.status || "PENDING");
      setEvidenceFile(null);
      setMessage("Your photo verification is waiting for admin review.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit verification.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-3xl bg-white p-6 md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Verify me</p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-burgundy-dark">Photo verification</h1>
      <p className="mt-4 leading-7 text-mauve-dark">Upload a clear selfie/photo for the admin queue. Hold today&apos;s date or your Thai My Heart username in the image.</p>
      <div className="mt-5 rounded-3xl bg-cream-200 p-4 text-sm font-bold text-burgundy">Current status: {status}</div>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        {message && <Toast tone="success">{message}</Toast>}
        {error && <Toast tone="warning">{error}</Toast>}
        <label className={`grid min-h-32 cursor-pointer place-items-center rounded-3xl border border-dashed border-gold/45 bg-cream px-4 py-6 text-center text-sm font-bold text-burgundy ${loading ? "opacity-70" : ""}`}>
          <span className="grid gap-2 justify-items-center">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
            <span>{evidenceFile ? evidenceFile.name : "Choose verification photo"}</span>
            <span className="text-xs font-semibold text-mauve-dark">JPG, PNG, WEBP, or GIF. The file uploads privately to TMH media storage.</span>
          </span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={loading} onChange={selectEvidence} />
        </label>
        <textarea className="min-h-28 rounded-2xl border border-cream-300 bg-cream px-4 py-3 text-sm outline-none focus:border-gold" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the admin reviewer" />
        <Button type="submit" variant="primary" disabled={loading || !evidenceFile}>
          {loading ? "Submitting..." : "Submit for review"}
        </Button>
      </form>
    </Card>
  );
}
