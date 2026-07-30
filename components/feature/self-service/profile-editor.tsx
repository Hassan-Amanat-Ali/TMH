"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { signOut } from "next-auth/react";
import { Camera, Loader2, UploadCloud } from "lucide-react";
import { Button, Card, Input, Toast } from "@/components/ui";
import { uploadMediaFile } from "@/lib/client/media-upload";
import type { MemberProfileForm } from "@/lib/server/services/member-self-service";

export function ProfileEditor({ profile }: { profile: MemberProfileForm }) {
  const [form, setForm] = useState(profile);
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  function update(field: keyof MemberProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as { ok?: boolean; completion?: number; error?: string };
    setSaving(false);
    if (!response.ok || !data.ok) {
      setError(data.error || "Unable to update profile.");
      return;
    }
    if (typeof data.completion === "number") {
      setForm((current) => ({ ...current, completion: data.completion ?? current.completion }));
    }
    setMessage("Profile updated. Your next match sees the cleaner version.");
  }

  async function uploadProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, WEBP, or GIF profile photo.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await uploadMediaFile(file, "profile-photo");
      const response = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; photoCount?: number; error?: string } | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save profile photo.");
      setForm((current) => ({ ...current, photoCount: data.photoCount ?? current.photoCount + 1 }));
      setMessage("Photo added. Thank you for keeping your profile real.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    const response = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string };
    setDeleting(false);
    if (!response.ok || !data.ok) {
      setError(data.message || "Unable to delete account.");
      return;
    }
    setMessage(data.message || "Account deleted.");
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
      <Card className="bg-white p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">My profile</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-burgundy-dark">Edit your dating profile</h1>
        <form onSubmit={saveProfile} className="mt-6 grid gap-4">
          {message && <Toast tone="success">{message}</Toast>}
          {error && <Toast tone="warning">{error}</Toast>}
          <div className="grid gap-4 md:grid-cols-2">
            <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Account name" />
            <Input value={form.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="Display name" />
            <Input value={form.intent} onChange={(event) => update("intent", event.target.value)} placeholder="Relationship intent" />
            <Input value={form.profession} onChange={(event) => update("profession", event.target.value)} placeholder="Profession" />
            <Input value={form.locationText} onChange={(event) => update("locationText", event.target.value)} placeholder="Location" />
            <Input value={form.countryCode} onChange={(event) => update("countryCode", event.target.value)} placeholder="Country code e.g. TH" />
          </div>
          <Input value={form.headline} onChange={(event) => update("headline", event.target.value)} placeholder="Headline" />
          <textarea className="min-h-36 rounded-2xl border border-cream-300 bg-cream px-4 py-3 text-sm outline-none focus:border-gold" value={form.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Bio" />
          <div className="grid gap-4 md:grid-cols-3">
            <Input value={form.languages} onChange={(event) => update("languages", event.target.value)} placeholder="Languages, comma separated" />
            <Input value={form.interests} onChange={(event) => update("interests", event.target.value)} placeholder="Interests, comma separated" />
            <Input value={form.goals} onChange={(event) => update("goals", event.target.value)} placeholder="Goals, comma separated" />
          </div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </Card>

      <aside className="space-y-5">
        <Card className="bg-chrome p-6 text-cream">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">Completion</p>
          <div className="mt-4 text-5xl font-bold text-gold-light">{form.completion}%</div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, form.completion)}%` }} />
          </div>
          <p className="mt-4 text-sm leading-6 text-cream-200">Complete, honest profiles build trust when they include photos, details, and verification.</p>
        </Card>
        <Card className="bg-white p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/20 text-burgundy"><Camera className="h-5 w-5" /></span>
            <div>
              <h2 className="font-serif text-2xl font-bold text-burgundy">Profile photos</h2>
              <p className="mt-1 text-sm leading-6 text-mauve-dark">{form.photoCount ? `${form.photoCount} photo${form.photoCount === 1 ? "" : "s"} uploaded.` : "Add your first real photo so members do not see a placeholder."}</p>
            </div>
          </div>
          <label className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-4 text-sm font-bold text-cream ${uploadingPhoto ? "opacity-70" : "cursor-pointer"}`}>
            {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {uploadingPhoto ? "Uploading..." : form.photoCount ? "Add another photo" : "Add your photo"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={uploadingPhoto} onChange={uploadProfilePhoto} />
          </label>
        </Card>
        <Card className="bg-white p-6">
          <h2 className="font-serif text-2xl font-bold text-burgundy">Account settings</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-mauve-dark">Membership</dt><dd className="font-bold text-burgundy">{form.membership}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-mauve-dark">Coins</dt><dd className="font-bold text-burgundy">{form.coinBalance}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-mauve-dark">Photos</dt><dd className="font-bold text-burgundy">{form.photoCount}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-mauve-dark">Verification</dt><dd className="font-bold text-burgundy">{form.verificationStatus}</dd></div>
          </dl>
        </Card>
        <form onSubmit={deleteAccount} className="rounded-3xl border border-danger/20 bg-danger/5 p-5">
          <h2 className="font-serif text-2xl font-bold text-danger">Delete account</h2>
          <p className="mt-2 text-sm leading-6 text-mauve-dark">This requires your current password and permanently removes your account.</p>
          <div className="mt-4 grid gap-4">
            {confirming && <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Confirm password" required />}
            <Button type="submit" variant="danger" disabled={deleting || (confirming && !password)}>
              {deleting ? "Deleting..." : confirming ? "Permanently delete account" : "Start deletion"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
