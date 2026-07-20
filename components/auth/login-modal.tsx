"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Input, Modal, Toast } from "@/components/ui";

function LoginModalInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const next = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const open = searchParams.get("login") === "1" && !dismissed;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (!result?.ok) {
      setError(result?.error === "account-restricted" ? "This account is restricted." : "Email or password is incorrect.");
      return;
    }

    setDismissed(true);
    router.push(next);
    router.refresh();
  }

  function close() {
    setDismissed(true);
    router.replace("/");
  }

  return (
    <Modal open={open} title="Sign in" onClose={close}>
      <form onSubmit={onSubmit} className="grid gap-4">
        {error && <Toast tone="warning">{error}</Toast>}
        <label className="grid gap-2 text-sm font-semibold text-mauve-dark">
          Email
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-mauve-dark">
          Password
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        </label>
        <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
        <div className="flex flex-wrap justify-between gap-3 text-sm text-mauve-dark">
          <Link href="/forgot-password" className="font-semibold text-burgundy hover:underline">Forgot password?</Link>
          <Link href="/signup" className="font-semibold text-burgundy hover:underline">Create account</Link>
        </div>
      </form>
    </Modal>
  );
}

export function LoginModal() {
  return (
    <Suspense fallback={null}>
      <LoginModalInner />
    </Suspense>
  );
}
