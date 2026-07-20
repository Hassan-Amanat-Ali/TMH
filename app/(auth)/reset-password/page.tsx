"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, Input, Toast } from "@/components/ui";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    setError("");
    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, passwordConfirm }),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string };
    setLoading(false);
    if (!response.ok || !data.ok) {
      setError(data.message || "Unable to reset password.");
      return;
    }
    setStatus(data.message || "Password reset successful.");
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-220px)] max-w-xl place-items-center px-4 py-12">
      <Card className="w-full p-8">
        <h1 className="font-serif text-4xl font-bold text-burgundy-dark">Reset password</h1>
        {!token ? (
          <Toast tone="warning">This reset link is missing a token.</Toast>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            {status && <Toast tone="success">{status}</Toast>}
            {error && <Toast tone="warning">{error}</Toast>}
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="New password" />
            <Input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} required placeholder="Confirm password" />
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Set new password"}</Button>
          </form>
        )}
        <Link href="/?login=1" className="mt-5 inline-block text-sm font-semibold text-burgundy hover:underline">Back to sign in</Link>
      </Card>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
