"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { Archive, Ban, Flag, ImagePlus, Languages, Send, Star, Tag, Undo2, X } from "lucide-react";
import { Button, Card, Toast } from "@/components/ui";
import { SendGiftButton, type GiftOption } from "@/components/feature/economy/send-gift-button";
import type { ChatMessage, ConversationDetail, ConversationSummary } from "@/lib/server/services/messaging";

export function MessagingView({
  currentUserId,
  initialConversations,
  initialConversation,
  initialFilters,
  giftOptions,
  giftBalance,
}: {
  currentUserId: string;
  initialConversations: ConversationSummary[];
  initialConversation: ConversationDetail | null;
  initialFilters: { favourite?: boolean; label?: string; archived?: boolean };
  giftOptions: GiftOption[];
  giftBalance: number;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [active, setActive] = useState(initialConversation);
  const [draft, setDraft] = useState("");
  const [label, setLabel] = useState(initialConversation?.label || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("SCAM");
  const [reportNote, setReportNote] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [translations, setTranslations] = useState<Record<string, string>>({});

  async function loadConversation(conversationId: string) {
    setError("");
    setNotice("");
    const response = await fetch(`/api/messages/conversations/${conversationId}/messages`);
    const data = (await response.json()) as { conversation?: ConversationDetail; error?: string };
    if (!response.ok || !data.conversation) {
      setError(data.error || "Could not open conversation.");
      return;
    }
    setActive(data.conversation);
    setLabel(data.conversation.label || "");
    setReportOpen(false);
    setReportNote("");
    setImageDataUrl("");
    void fetch(`/api/messages/conversations/${conversationId}/read`, { method: "POST" });
    setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!active || (!draft.trim() && !imageDataUrl)) return;
    setSending(true);
    setError("");
    setNotice("");
    const body = draft.trim();
    const mediaUrl = imageDataUrl;
    setDraft("");
    setImageDataUrl("");
    const response = await fetch(`/api/messages/conversations/${active.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mediaUrl ? { body, mediaUrl, type: "IMAGE" } : { body, type: "TEXT" }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string; warning?: string | null };
    setSending(false);
    if (!response.ok || !data.ok) {
      setError(data.error || "Could not send message.");
      setDraft(body);
      setImageDataUrl(mediaUrl);
      return;
    }
    if (data.warning) setNotice(data.warning);
    await loadConversation(active.id);
  }

  async function blockConversation() {
    if (!active) return;
    const response = await fetch(`/api/messages/conversations/${active.id}/block`, { method: "POST" });
    if (response.ok) {
      setActive({ ...active, blocked: true, blockedByMe: true });
    }
  }

  async function unblockConversation() {
    if (!active) return;
    const response = await fetch(`/api/messages/conversations/${active.id}/block`, { method: "DELETE" });
    if (response.ok) {
      setActive({ ...active, blocked: false, blockedByMe: false });
    }
  }

  async function saveTag(next: { favourite?: boolean; label?: string }) {
    if (!active) return;
    const response = await fetch(`/api/messages/conversations/${active.id}/tag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (response.ok) {
      const updated = { ...active, favourite: next.favourite ?? active.favourite, label: next.label ?? active.label };
      setActive(updated);
      setConversations((items) => items.map((item) => item.id === active.id ? { ...item, favourite: updated.favourite, label: updated.label } : item));
    }
  }

  async function archiveConversation() {
    if (!active) return;
    const response = await fetch(`/api/messages/conversations/${active.id}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !active.archived }),
    });
    if (response.ok) {
      setConversations((items) => items.filter((item) => item.id !== active.id));
      setNotice(active.archived ? "Conversation restored." : "Conversation archived.");
      setActive({ ...active, archived: !active.archived });
    }
  }

  async function submitReport() {
    if (!active) return;
    setError("");
    setNotice("");
    const response = await fetch(`/api/messages/conversations/${active.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: reportCategory, note: reportNote }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error || "Could not submit report.");
      return;
    }
    setReportOpen(false);
    setReportNote("");
    setNotice("Report submitted. Our moderation team will review this conversation.");
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 450_000) {
      setError("Temporary photo messages are limited to roughly 450 KB until media storage is configured.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setError("Could not read image.");
    reader.readAsDataURL(file);
  }

  async function translateMessage(message: ChatMessage) {
    if (!message.body) return;
    setError("");
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message.body, target: "en" }),
    });
    const data = (await response.json()) as { ok?: boolean; translatedText?: string; error?: string };
    if (!response.ok || !data.ok) {
      setNotice(data.error || "Translation is not available.");
      return;
    }
    setTranslations((items) => ({ ...items, [message.id]: data.translatedText || "" }));
  }

  const messages: ChatMessage[] = active?.messages || [];

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[300px_1fr_300px] lg:px-8">
      <Card className="h-fit bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Messages</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-burgundy">Conversations</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <Link href="/messages" className={`rounded-full px-3 py-1.5 ${!initialFilters.favourite && !initialFilters.archived && !initialFilters.label ? "bg-burgundy text-cream" : "bg-cream-200 text-burgundy"}`}>All</Link>
          <Link href="/messages?favourite=1" className={`rounded-full px-3 py-1.5 ${initialFilters.favourite ? "bg-burgundy text-cream" : "bg-cream-200 text-burgundy"}`}>Favourites</Link>
          <Link href="/messages?archived=1" className={`rounded-full px-3 py-1.5 ${initialFilters.archived ? "bg-burgundy text-cream" : "bg-cream-200 text-burgundy"}`}>Archived</Link>
        </div>
        <div className="mt-4 space-y-2">
          {conversations.length ? conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`flex w-full gap-3 rounded-3xl p-3 text-left transition ${active?.id === conversation.id ? "bg-cream-200" : "bg-cream-100 hover:bg-cream-200"}`}
              onClick={() => loadConversation(conversation.id)}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
                <Image src={conversation.otherPhoto} alt={conversation.otherName} fill sizes="56px" className="object-cover" />
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-burgundy">{conversation.otherName}</span>
                  {conversation.unreadCount > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">{conversation.unreadCount}</span>}
                </span>
                <span className="mt-1 flex gap-1">
                  {conversation.favourite && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-burgundy">Favourite</span>}
                  {conversation.label && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-mauve-dark">{conversation.label}</span>}
                </span>
                <span className="mt-1 block truncate text-xs text-mauve-dark">{conversation.lastMessage}</span>
                <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-mauve">{conversation.lastMessageAt}</span>
              </span>
            </button>
          )) : <p className="rounded-3xl bg-cream-100 p-4 text-sm text-mauve-dark">No conversations here yet.</p>}
        </div>
      </Card>

      <Card className="flex min-h-[620px] flex-col overflow-hidden bg-white">
        {error && <div className="p-4"><Toast tone="warning">{error}</Toast></div>}
        {notice && <div className="p-4"><Toast tone="success">{notice}</Toast></div>}
        {active ? (
          <>
            <div className="flex items-center justify-between gap-4 border-b border-cream-300 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Chat with</p>
                <h2 className="font-serif text-3xl font-bold text-burgundy">{active.otherName}</h2>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant={active.favourite ? "gold" : "ghost"} className={active.favourite ? "" : "border-burgundy/15 bg-cream text-burgundy"} onClick={() => saveTag({ favourite: !active.favourite })}>
                  <Star size={16} />
                  Favourite
                </Button>
                <Button type="button" variant="ghost" className="border-burgundy/15 bg-cream text-burgundy" onClick={archiveConversation}>
                  <Archive size={16} />
                  {active.archived ? "Restore" : "Archive"}
                </Button>
                {active.blockedByMe ? (
                  <Button type="button" variant="ghost" className="border-verified/25 bg-verified/5 text-verified" onClick={unblockConversation}>
                    <Undo2 size={16} />
                    Unblock
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" className="border-danger/25 bg-danger/5 text-danger" onClick={blockConversation} disabled={active.blockedByOther}>
                    <Ban size={16} />
                    {active.blockedByOther ? "Blocked" : "Block"}
                  </Button>
                )}
                <Button type="button" variant="ghost" className="border-danger/25 bg-danger/5 text-danger" onClick={() => setReportOpen((value) => !value)}>
                  <Flag size={16} />
                  Report
                </Button>
              </div>
            </div>
            {reportOpen && (
              <div className="grid gap-3 border-b border-danger/15 bg-danger/5 p-4 md:grid-cols-[180px_1fr_auto]">
                <select className="min-h-11 rounded-2xl border border-danger/20 bg-white px-3 text-sm font-bold text-burgundy outline-none" value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}>
                  <option value="SCAM">Scam or money request</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="SPAM">Spam</option>
                  <option value="EXPLICIT_CONTENT">Explicit content</option>
                  <option value="FAKE_PROFILE">Fake profile</option>
                  <option value="OTHER">Other</option>
                </select>
                <input className="min-h-11 rounded-2xl border border-danger/20 bg-white px-3 text-sm outline-none focus:border-danger" value={reportNote} onChange={(event) => setReportNote(event.target.value)} placeholder="Optional note for moderators" />
                <Button type="button" variant="primary" className="bg-danger hover:bg-danger/90" onClick={submitReport}>
                  Submit report
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-b border-cream-300 bg-cream-100 p-3">
              <Tag size={16} className="text-burgundy" />
              <input className="min-h-9 flex-1 rounded-full border border-cream-300 bg-white px-3 text-sm outline-none focus:border-gold" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label, e.g. Reply Later" />
              <Button type="button" variant="gold" className="min-h-9 px-4 py-1.5 text-xs" onClick={() => saveTag({ label })}>Save label</Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-cream-100 p-4">
              {messages.length ? messages.map((message) => {
                const mine = message.senderId === currentUserId;
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-6 ${mine ? "bg-burgundy text-cream" : "bg-white text-ink"}`}>
                      {message.type === "GIFT" ? (
                        <div className={`mb-3 flex items-center gap-3 rounded-2xl px-3 py-2 ${mine ? "bg-white/10" : "bg-cream-100"}`}>
                          <span className="text-3xl">{message.mediaUrl || "Gift"}</span>
                          <span className="text-xs font-bold uppercase tracking-[0.14em]">Gift sent</span>
                        </div>
                      ) : message.mediaUrl ? (
                        <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="relative mb-3 block aspect-[4/3] w-56 max-w-full overflow-hidden rounded-2xl bg-black/10">
                          <Image src={message.mediaUrl} alt="Message attachment" fill sizes="224px" className="object-cover" />
                        </a>
                      ) : null}
                      {message.body ? <p>{message.body}</p> : null}
                      {translations[message.id] ? <p className={`mt-2 rounded-2xl px-3 py-2 text-xs ${mine ? "bg-white/10 text-cream" : "bg-cream-100 text-mauve-dark"}`}>{translations[message.id]}</p> : null}
                      <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] ${mine ? "text-cream/65" : "text-mauve"}`}>
                        <span>{message.createdAt}</span>
                        {message.readReceiptVisible ? <span>{message.read ? `Read${message.readAt ? ` ${message.readAt}` : ""}` : "Sent"}</span> : null}
                        {active.translationEnabled && message.body ? (
                          <button type="button" className="inline-flex items-center gap-1 underline decoration-current/40" onClick={() => translateMessage(message)}>
                            <Languages size={12} />
                            Translate
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              }) : <p className="rounded-3xl bg-white p-4 text-sm text-mauve-dark">Start with a warm, respectful hello.</p>}
            </div>
            <form onSubmit={sendMessage} className="border-t border-cream-300 p-4">
              {imageDataUrl ? (
                <div className="mb-3 flex items-center gap-3 rounded-3xl border border-gold/30 bg-cream p-3">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl">
                    <Image src={imageDataUrl} alt="Selected attachment" fill sizes="80px" className="object-cover" />
                  </div>
                  <p className="flex-1 text-sm font-semibold text-mauve-dark">Photo ready. Add an optional caption before sending.</p>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white text-burgundy" aria-label="Remove photo" onClick={() => setImageDataUrl("")}>
                    <X size={16} />
                  </button>
                </div>
              ) : null}
              <div className="flex gap-3">
                <label className={`grid min-h-12 w-12 shrink-0 place-items-center rounded-full border border-cream-300 bg-cream text-burgundy ${active.blocked || sending ? "opacity-50" : "cursor-pointer"}`} aria-label="Attach photo">
                  <ImagePlus size={18} />
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={active.blocked || sending} onChange={selectImage} />
                </label>
                <textarea
                  className="min-h-12 flex-1 resize-none rounded-3xl border border-cream-300 bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={active.blocked ? "Conversation blocked" : imageDataUrl ? "Optional caption..." : "Write a thoughtful message..."}
                  disabled={active.blocked || sending}
                />
                <Button type="submit" variant="primary" disabled={active.blocked || sending || (!draft.trim() && !imageDataUrl)}>
                  <Send size={18} />
                  Send
                </Button>
              </div>
              <p className="mt-2 text-xs font-semibold text-mauve-dark">Photo messages unlock after 30 days and are limited to 10 per 24 hours.</p>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">No chat selected</p>
              <h2 className="mt-2 font-serif text-4xl font-bold text-burgundy">Choose a conversation</h2>
              <p className="mt-3 text-mauve-dark">Or browse search, open a profile, and start one.</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="h-fit bg-chrome p-5 text-cream">
        {active ? (
          <>
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
              <Image src={active.otherPhoto} alt={active.otherName} fill sizes="300px" className="object-cover" />
            </div>
            <h2 className="mt-4 font-serif text-3xl font-bold text-gold-light">{active.otherName}</h2>
            <p className="mt-1 text-sm text-cream-200">{active.otherLocation}</p>
            <p className="mt-4 text-sm leading-6 text-cream-200">{active.otherHeadline}</p>
            <Link href={`/profiles/${active.otherUserId}`} className="mt-5 block rounded-full bg-gold px-5 py-3 text-center text-sm font-bold text-burgundy-dark">
              View profile
            </Link>
            <div className="mt-3">
              <SendGiftButton receiverId={active.otherUserId} receiverName={active.otherName} gifts={giftOptions} initialBalance={giftBalance} compact />
            </div>
          </>
        ) : (
          <p className="text-sm leading-6 text-cream-200">Profile preview appears here after you select a conversation.</p>
        )}
      </Card>
    </div>
  );
}
