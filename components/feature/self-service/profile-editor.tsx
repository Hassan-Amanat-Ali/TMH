"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { signOut } from "next-auth/react";
import { Camera, Eye, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import { Button, Card, Input, Toast } from "@/components/ui";
import { uploadMediaFile } from "@/lib/client/media-upload";
import type { MemberProfileForm } from "@/lib/server/services/member-self-service";

type EditableProfileField =
  | "name"
  | "displayName"
  | "headline"
  | "bio"
  | "gender"
  | "seeking"
  | "dateOfBirth"
  | "age"
  | "intent"
  | "heightCm"
  | "bodyType"
  | "children"
  | "wantChildren"
  | "smoking"
  | "drinking"
  | "religion"
  | "education"
  | "locationText"
  | "countryCode"
  | "profession"
  | "exercise"
  | "relocate"
  | "languages"
  | "interests"
  | "goals";

const genderOptions = [
  ["", "Not selected"],
  ["WOMAN", "Woman"],
  ["MAN", "Man"],
  ["LADYBOY", "Ladyboy"],
  ["OTHER", "Other"],
];

const lifestyleOptions = ["", "Never", "Sometimes", "Socially", "Often"];
const yesNoOptions = ["", "Yes", "No", "Open to it"];

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-[0.16em] text-mauve-dark">
      {children}
    </label>
  );
}

function Field({ label, id, children, hint }: { label: string; id: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint ? <p className="text-xs leading-5 text-mauve-dark">{hint}</p> : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[] | string[][];
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-2xl border border-cream-300 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-gold"
      >
        {options.map((option) => {
          const valueLabel = Array.isArray(option) ? option : [option, option || "Not selected"];
          return <option key={valueLabel[0]} value={valueLabel[0]}>{valueLabel[1]}</option>;
        })}
      </select>
    </Field>
  );
}

export function ProfileEditor({ profile }: { profile: MemberProfileForm }) {
  const [form, setForm] = useState(profile);
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);

  function update(field: EditableProfileField, value: string) {
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
      const data = (await response.json().catch(() => null)) as { ok?: boolean; photo?: { id: string; url: string; isPrimary: boolean }; photoCount?: number; error?: string } | null;
      if (!response.ok || !data?.ok || !data.photo) throw new Error(data?.error || "Could not save profile photo.");
      const addedPhoto = data.photo;
      setForm((current) => ({
        ...current,
        photos: [...current.photos.map((photo) => ({ ...photo, isPrimary: addedPhoto.isPrimary ? false : photo.isPrimary })), addedPhoto],
        photoCount: data.photoCount ?? current.photoCount + 1,
      }));
      setMessage("Photo added. Thank you for keeping your profile real.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function setPrimaryPhoto(photoId: string) {
    setPhotoBusyId(photoId);
    setError("");
    setMessage("");
    const response = await fetch("/api/profile/photo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photoId, isPrimary: true }),
    });
    setPhotoBusyId(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Could not set primary photo.");
      return;
    }
    setForm((current) => ({
      ...current,
      photos: current.photos.map((photo) => ({ ...photo, isPrimary: photo.id === photoId })),
    }));
    setMessage("Primary photo updated.");
  }

  async function deletePhoto(photoId: string) {
    setPhotoBusyId(photoId);
    setError("");
    setMessage("");
    const response = await fetch("/api/profile/photo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photoId }),
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; photoCount?: number; error?: string } | null;
    setPhotoBusyId(null);
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Could not delete photo.");
      return;
    }
    const remaining = form.photos.filter((photo) => photo.id !== photoId);
    setForm((current) => ({
      ...current,
      photos: remaining.length && !remaining.some((photo) => photo.isPrimary) ? remaining.map((photo, index) => ({ ...photo, isPrimary: index === 0 })) : remaining,
      photoCount: data.photoCount ?? Math.max(0, current.photoCount - 1),
    }));
    setMessage("Photo removed.");
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">My profile</p>
            <h1 className="mt-2 font-serif text-4xl font-bold text-burgundy-dark">Edit your dating profile</h1>
          </div>
          <Link href="/my-profile?preview=1" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-burgundy/20 bg-cream px-5 py-2.5 text-sm font-semibold text-burgundy hover:bg-cream-200">
            <Eye className="h-4 w-4" />
            Preview profile
          </Link>
        </div>
        <form onSubmit={saveProfile} className="mt-6 grid gap-7">
          {message && <Toast tone="success">{message}</Toast>}
          {error && <Toast tone="warning">{error}</Toast>}

          <section className="grid gap-4">
            <h2 className="font-serif text-2xl font-bold text-burgundy">Basics</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="profile-name" label="Account name"><Input id="profile-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Account name" /></Field>
              <Field id="profile-display-name" label="Display name"><Input id="profile-display-name" value={form.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="Display name shown to members" /></Field>
              <SelectField id="profile-gender" label="Gender" value={form.gender} options={genderOptions} onChange={(value) => update("gender", value)} />
              <SelectField id="profile-seeking" label="Seeking" value={form.seeking} options={genderOptions} onChange={(value) => update("seeking", value)} />
              <Field id="profile-date-of-birth" label="Date of birth"><Input id="profile-date-of-birth" type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} /></Field>
              <Field id="profile-age" label="Age"><Input id="profile-age" type="number" min="18" max="99" value={form.age} onChange={(event) => update("age", event.target.value)} placeholder="Age" /></Field>
              <Field id="profile-location" label="Location"><Input id="profile-location" value={form.locationText} onChange={(event) => update("locationText", event.target.value)} placeholder="City or area" /></Field>
              <Field id="profile-country" label="Country code"><Input id="profile-country" value={form.countryCode} maxLength={2} onChange={(event) => update("countryCode", event.target.value)} placeholder="TH, GB, US" /></Field>
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="font-serif text-2xl font-bold text-burgundy">Story</h2>
            <Field id="profile-headline" label="Headline"><Input id="profile-headline" value={form.headline} onChange={(event) => update("headline", event.target.value)} placeholder="A short, warm profile headline" /></Field>
            <Field id="profile-bio" label="Bio"><textarea id="profile-bio" className="min-h-36 rounded-2xl border border-cream-300 bg-cream px-4 py-3 text-sm outline-none focus:border-gold" value={form.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Tell members who you are, what matters to you, and what kind of connection you want." /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="profile-intent" label="Relationship intent"><Input id="profile-intent" value={form.intent} onChange={(event) => update("intent", event.target.value)} placeholder="Serious relationship, marriage, friendship first..." /></Field>
              <Field id="profile-profession" label="Profession"><Input id="profile-profession" value={form.profession} onChange={(event) => update("profession", event.target.value)} placeholder="Profession or vocation" /></Field>
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="font-serif text-2xl font-bold text-burgundy">Lifestyle</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field id="profile-height" label="Height"><Input id="profile-height" type="number" min="120" max="230" value={form.heightCm} onChange={(event) => update("heightCm", event.target.value)} placeholder="cm" /></Field>
              <Field id="profile-body-type" label="Body type"><Input id="profile-body-type" value={form.bodyType} onChange={(event) => update("bodyType", event.target.value)} placeholder="Optional" /></Field>
              <Field id="profile-education" label="Education"><Input id="profile-education" value={form.education} onChange={(event) => update("education", event.target.value)} placeholder="Optional" /></Field>
              <SelectField id="profile-smoking" label="Smoking" value={form.smoking} options={lifestyleOptions} onChange={(value) => update("smoking", value)} />
              <SelectField id="profile-drinking" label="Drinking" value={form.drinking} options={lifestyleOptions} onChange={(value) => update("drinking", value)} />
              <Field id="profile-religion" label="Religion"><Input id="profile-religion" value={form.religion} onChange={(event) => update("religion", event.target.value)} placeholder="Optional" /></Field>
              <Field id="profile-children" label="Children"><Input id="profile-children" value={form.children} onChange={(event) => update("children", event.target.value)} placeholder="Have children? Optional" /></Field>
              <SelectField id="profile-want-children" label="Want children" value={form.wantChildren} options={yesNoOptions} onChange={(value) => update("wantChildren", value)} />
              <Field id="profile-exercise" label="Exercise"><Input id="profile-exercise" value={form.exercise} onChange={(event) => update("exercise", event.target.value)} placeholder="Weekly, sometimes..." /></Field>
              <SelectField id="profile-relocate" label="Open to relocate" value={form.relocate} options={yesNoOptions} onChange={(value) => update("relocate", value)} />
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="font-serif text-2xl font-bold text-burgundy">Connection details</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field id="profile-languages" label="Languages" hint="Separate each language with a comma."><Input id="profile-languages" value={form.languages} onChange={(event) => update("languages", event.target.value)} placeholder="Thai, English" /></Field>
              <Field id="profile-interests" label="Interests" hint="Separate interests with commas."><Input id="profile-interests" value={form.interests} onChange={(event) => update("interests", event.target.value)} placeholder="Cooking, travel, films" /></Field>
              <Field id="profile-goals" label="Goals" hint="Separate goals with commas."><Input id="profile-goals" value={form.goals} onChange={(event) => update("goals", event.target.value)} placeholder="Marriage, family, travel" /></Field>
            </div>
          </section>

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
          <div className="mt-4 grid gap-3">
            {form.photos.map((photo) => (
              <div key={photo.id} className="rounded-3xl border border-cream-300 bg-cream-100 p-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream-200">
                  <Image src={photo.url} alt="Profile photo" fill sizes="280px" className="object-cover" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant={photo.isPrimary ? "gold" : "ghostLight"} className="min-h-9 px-3 py-1.5 text-xs" disabled={photoBusyId === photo.id || photo.isPrimary} onClick={() => setPrimaryPhoto(photo.id)}>
                    <Star className={photo.isPrimary ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                    {photo.isPrimary ? "Primary" : "Set primary"}
                  </Button>
                  <Button type="button" variant="ghostLight" className="min-h-9 border-danger/25 bg-danger/5 px-3 py-1.5 text-xs text-danger hover:bg-danger/10" disabled={photoBusyId === photo.id} onClick={() => deletePhoto(photo.id)}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {!form.photos.length ? <p className="rounded-3xl border border-dashed border-cream-300 bg-cream-100 p-4 text-sm leading-6 text-mauve-dark">No photos yet. Your first approved photo becomes your primary profile image.</p> : null}
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
