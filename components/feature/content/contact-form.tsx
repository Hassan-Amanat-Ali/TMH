"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Input, Select, Toast } from "@/components/ui";

export function ContactForm() {
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(params.get("type") === "appeal" ? "Account appeal" : "");
  const [type, setType] = useState(params.get("type") === "appeal" ? "APPEAL" : "GENERAL");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setNotice("");
    setError("");
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message, type }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setPending(false);
    if (!response.ok || !data.ok) {
      setError(data.error || "Could not send your request.");
      return;
    }
    setNotice(type === "APPEAL" ? "Appeal received. The moderation team will review it." : "Message received. Support will follow up when possible.");
    setMessage("");
    setSubject(type === "APPEAL" ? "Account appeal" : "");
  }

  return (
    <Card className="bg-white p-6">
      {notice ? <Toast tone="success">{notice}</Toast> : null}
      {error ? <div className="mt-3"><Toast tone="warning">{error}</Toast></div> : null}
      <form onSubmit={submit} className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" required />
        </div>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="GENERAL">General support</option>
            <option value="APPEAL">Suspension appeal</option>
          </Select>
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" required />
        </div>
        <textarea className="min-h-40 rounded-2xl border border-cream-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/25" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what happened. If this is an appeal, include your account email and any context moderators should review." required />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Sending..." : "Send request"}
        </Button>
      </form>
    </Card>
  );
}
