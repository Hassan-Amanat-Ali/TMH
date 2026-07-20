"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Card, Chip, Input, Select, Toast } from "@/components/ui";

const steps = [
  "Account",
  "Appearance",
  "Language",
  "Lifestyle",
  "Goals",
  "About",
  "Preferences",
  "Verify",
];

type FormState = {
  userName: string;
  email: string;
  emailConfirm: string;
  password: string;
  passwordConfirm: string;
  age: string;
  locationText: string;
  countryCode: string;
  gender: string;
  seeking: string;
  heightCm: string;
  bodyType: string;
  children: string;
  wantChildren: string;
  smoking: string;
  drinking: string;
  primaryLanguage: string;
  otherLanguages: string;
  relocate: string;
  profession: string;
  religion: string;
  exercise: string;
  relationshipGoal: string;
  partnerLocation: string;
  headline: string;
  bio: string;
  interests: string;
  goals: string;
};

const initialForm: FormState = {
  userName: "",
  email: "",
  emailConfirm: "",
  password: "",
  passwordConfirm: "",
  age: "",
  locationText: "",
  countryCode: "",
  gender: "woman",
  seeking: "man",
  heightCm: "",
  bodyType: "",
  children: "",
  wantChildren: "",
  smoking: "",
  drinking: "",
  primaryLanguage: "",
  otherLanguages: "",
  relocate: "",
  profession: "",
  religion: "",
  exercise: "",
  relationshipGoal: "",
  partnerLocation: "",
  headline: "",
  bio: "",
  interests: "",
  goals: "",
};

function passwordValid(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [verificationSessionId, setVerificationSessionId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function prefillCountry() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) return;
        const data = (await response.json()) as { country_code?: string; country_name?: string; city?: string };
        if (cancelled) return;
        setForm((current) => ({
          ...current,
          countryCode: current.countryCode || String(data.country_code || "").slice(0, 2).toUpperCase(),
          locationText: current.locationText || [data.city, data.country_name].filter(Boolean).join(", "),
        }));
      } catch {
        // Geo prefill is optional.
      }
    }
    void prefillCountry();
    return () => {
      cancelled = true;
    };
  }, []);

  const completion = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setMessage("");
  }

  function validateCurrentStep() {
    if (step === 0) {
      if (!form.userName.trim()) return "Choose a username.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email.";
      if (form.email !== form.emailConfirm) return "Emails do not match.";
      if (!passwordValid(form.password)) return "Password must be at least 8 characters with one capital letter and one number.";
      if (form.password !== form.passwordConfirm) return "Passwords do not match.";
      if (Number(form.age) < 18) return "You must be at least 18.";
      if (!form.locationText.trim() || !form.countryCode.trim()) return "Add your location and country code.";
    }
    if (step === 5 && form.bio.trim().length < 40) return "Write at least 40 characters about yourself.";
    return "";
  }

  function nextStep() {
    const issue = validateCurrentStep();
    if (issue) {
      setError(issue);
      return;
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function requestCode() {
    const issue = validateCurrentStep();
    if (issue) {
      setError(issue);
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/auth/email-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, userName: form.userName }),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string; sessionId?: string; devCode?: string };
    setLoading(false);
    if (!response.ok || !data.ok || !data.sessionId) {
      setError(data.message || "Unable to send verification code.");
      return;
    }
    setVerificationSessionId(data.sessionId);
    setDevCode(data.devCode || "");
    setMessage(data.devCode ? `Development code: ${data.devCode}` : data.message || "Verification code sent.");
  }

  async function verifyCode() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/email-verification", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: verificationSessionId, code: verificationCode }),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string };
    setLoading(false);
    if (!response.ok || !data.ok) {
      setError(data.message || "Unable to verify code.");
      return;
    }
    setVerified(true);
    setMessage("Email verified. You can create your account.");
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    if (!verified) {
      setError("Please verify your email first.");
      return;
    }
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/profile-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        verificationSessionId,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        languages: [form.primaryLanguage, ...splitList(form.otherLanguages)].filter(Boolean),
        interests: splitList(form.interests),
        goals: [form.relationshipGoal, form.partnerLocation, ...splitList(form.goals)].filter(Boolean),
      }),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !data.ok) {
      setLoading(false);
      setError(data.message || "Unable to create account.");
      return;
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    if (!result?.ok) {
      router.push("/?login=1&next=/dashboard");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Card className="overflow-hidden">
        <div className="border-b border-gold/20 bg-chrome p-6 text-cream md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-gold-light">Create profile</p>
              <h1 className="mt-2 font-serif text-4xl font-bold">Join Thai My Heart</h1>
            </div>
            <Chip active>{completion}%</Chip>
          </div>
          <div className="mt-6 grid gap-2 md:grid-cols-8">
            {steps.map((label, index) => (
              <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-full px-3 py-2 text-xs font-bold ${index === step ? "bg-gold text-burgundy-dark" : "bg-white/10 text-cream/70"}`}>
                {index + 1}. {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={finish} className="grid gap-6 p-6 md:p-8">
          {message && <Toast tone={devCode ? "warning" : "success"}>{message}</Toast>}
          {error && <Toast tone="warning">{error}</Toast>}

          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Username" value={form.userName} onChange={(event) => update("userName", event.target.value)} />
              <Input placeholder="Age" type="number" min={18} value={form.age} onChange={(event) => update("age", event.target.value)} />
              <Input placeholder="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value.trim().toLowerCase())} />
              <Input placeholder="Confirm email" type="email" value={form.emailConfirm} onChange={(event) => update("emailConfirm", event.target.value.trim().toLowerCase())} />
              <Input placeholder="Password" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} />
              <Input placeholder="Confirm password" type="password" value={form.passwordConfirm} onChange={(event) => update("passwordConfirm", event.target.value)} />
              <Input placeholder="City, Country" value={form.locationText} onChange={(event) => update("locationText", event.target.value)} />
              <Input placeholder="Country code, e.g. TH" maxLength={2} value={form.countryCode} onChange={(event) => update("countryCode", event.target.value.toUpperCase())} />
              <Select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                <option value="woman">Woman</option>
                <option value="man">Man</option>
                <option value="ladyboy">Ladyboy</option>
                <option value="other">Other</option>
              </Select>
              <Select value={form.seeking} onChange={(event) => update("seeking", event.target.value)}>
                <option value="woman">Seeking women</option>
                <option value="man">Seeking men</option>
                <option value="ladyboy">Seeking ladyboys</option>
                <option value="other">Open to other</option>
              </Select>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Height in cm" type="number" value={form.heightCm} onChange={(event) => update("heightCm", event.target.value)} />
              <Input placeholder="Body type" value={form.bodyType} onChange={(event) => update("bodyType", event.target.value)} />
              <Input placeholder="Children" value={form.children} onChange={(event) => update("children", event.target.value)} />
              <Input placeholder="Want children?" value={form.wantChildren} onChange={(event) => update("wantChildren", event.target.value)} />
              <Input placeholder="Smoking" value={form.smoking} onChange={(event) => update("smoking", event.target.value)} />
              <Input placeholder="Drinking" value={form.drinking} onChange={(event) => update("drinking", event.target.value)} />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Primary language" value={form.primaryLanguage} onChange={(event) => update("primaryLanguage", event.target.value)} />
              <Input placeholder="Other languages, comma separated" value={form.otherLanguages} onChange={(event) => update("otherLanguages", event.target.value)} />
              <Input placeholder="Open to relocate?" value={form.relocate} onChange={(event) => update("relocate", event.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Profession" value={form.profession} onChange={(event) => update("profession", event.target.value)} />
              <Input placeholder="Religion" value={form.religion} onChange={(event) => update("religion", event.target.value)} />
              <Input placeholder="Exercise / lifestyle" value={form.exercise} onChange={(event) => update("exercise", event.target.value)} />
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Relationship goal" value={form.relationshipGoal} onChange={(event) => update("relationshipGoal", event.target.value)} />
              <Input placeholder="Preferred partner location" value={form.partnerLocation} onChange={(event) => update("partnerLocation", event.target.value)} />
              <Input placeholder="Other goals, comma separated" value={form.goals} onChange={(event) => update("goals", event.target.value)} />
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-4">
              <Input placeholder="Profile headline" value={form.headline} onChange={(event) => update("headline", event.target.value)} />
              <textarea className="min-h-40 rounded-2xl border border-cream-300 bg-white p-4 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/25" placeholder="About you" value={form.bio} onChange={(event) => update("bio", event.target.value)} />
              <Input placeholder="Interests, comma separated" value={form.interests} onChange={(event) => update("interests", event.target.value)} />
            </div>
          )}

          {step === 6 && (
            <div className="grid gap-4">
              <Toast>Extended partner preferences will become detailed matching controls in Phase 2. For now, your relationship goals and seeking fields are saved to your profile.</Toast>
            </div>
          )}

          {step === 7 && (
            <div className="grid gap-4">
              <p className="text-sm leading-6 text-mauve-dark">Verify your email before creating your account. In development, when SMTP is not configured, the API returns a temporary code for testing.</p>
              {!verificationSessionId ? (
                <Button type="button" onClick={requestCode} disabled={loading}>{loading ? "Sending..." : "Send verification code"}</Button>
              ) : (
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <Input placeholder="4-digit code" maxLength={4} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} />
                  <Button type="button" onClick={verifyCode} disabled={loading || verified}>{verified ? "Verified" : "Verify code"}</Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 border-t border-cream-300 pt-5">
            <Button type="button" variant="ghost" className="border-burgundy/20 bg-burgundy/5 text-burgundy" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>Continue</Button>
            ) : (
              <Button type="submit" disabled={loading || !verified}>{loading ? "Creating..." : "Create account"}</Button>
            )}
          </div>
        </form>
      </Card>
    </section>
  );
}
