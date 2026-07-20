"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Toast } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    setError("");
    setLoading(true);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string };
    setLoading(false);
    if (!response.ok || !data.ok) {
      setError(data.message || "Unable to request reset.");
      return;
    }
    setStatus(data.message || "If this email exists, a password reset link has been sent.");
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-220px)] max-w-xl place-items-center px-4 py-12">
      <Card className="w-full p-8">
        <h1 className="font-serif text-4xl font-bold text-burgundy-dark">Forgot password</h1>
        <p className="mt-3 text-mauve-dark">Enter your email and we will send a reset link if the account exists.</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          {status && <Toast tone="success">{status}</Toast>}
          {error && <Toast tone="warning">{error}</Toast>}
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" />
          <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
        </form>
        <Link href="/?login=1" className="mt-5 inline-block text-sm font-semibold text-burgundy hover:underline">Back to sign in</Link>
      </Card>
    </section>
  );
}
