"use client";

import { Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button, Modal, Toast } from "@/components/ui";

export type GiftOption = {
  id: string;
  name: string;
  icon: string;
  costCoins: number;
};

export function SendGiftButton({
  receiverId,
  receiverName,
  gifts,
  initialBalance,
  compact = false,
}: {
  receiverId: string;
  receiverName: string;
  gifts: GiftOption[];
  initialBalance: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  async function send(gift: GiftOption) {
    setPending(gift.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/economy/gifts/${gift.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, message }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not send gift.");
      setBalance(result.balanceAfter);
      setMessage("");
      setNotice({ tone: "success", text: `${gift.name} sent to ${receiverName}.` });
    } catch (error) {
      setNotice({ tone: "warning", text: error instanceof Error ? error.message : "Could not send gift." });
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <Button type="button" variant={compact ? "gold" : "ghost"} className={compact ? "" : "border-burgundy/15 bg-cream text-burgundy"} onClick={() => setOpen(true)}>
        <Gift size={18} />
        Send gift
      </Button>
      <Modal open={open} title={`Send a gift to ${receiverName}`} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Wallet balance</p>
            <p className="mt-1 font-serif text-4xl font-bold text-burgundy">{balance} coins</p>
          </div>
          {notice && <Toast tone={notice.tone}>{notice.text}</Toast>}
          <textarea
            className="min-h-24 w-full resize-none rounded-2xl border border-cream-300 bg-white px-4 py-3 text-sm outline-none focus:border-gold"
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 500))}
            placeholder="Optional short note..."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {gifts.map((gift) => {
              const disabled = pending !== null || balance < gift.costCoins;
              return (
                <button
                  key={gift.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => send(gift)}
                  className="rounded-2xl border border-gold/20 bg-white p-4 text-left transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="text-3xl">{gift.icon}</span>
                  <span className="ml-3 align-middle text-sm font-bold text-ink">{gift.name}</span>
                  <span className="mt-2 block text-xs font-semibold text-mauve">{gift.costCoins} coins</span>
                  {pending === gift.id && <Loader2 className="mt-2 animate-spin text-burgundy" size={16} />}
                  {balance < gift.costCoins && <span className="mt-2 block text-xs font-bold text-danger">Need more coins</span>}
                </button>
              );
            })}
          </div>
          {gifts.length === 0 && <p className="text-sm text-mauve-dark">Gift catalogue is not available yet.</p>}
        </div>
      </Modal>
    </>
  );
}
