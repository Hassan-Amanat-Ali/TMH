"use client";

import { X } from "lucide-react";

export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-burgundy-dark/70 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-full max-w-sm flex-col border-l border-gold/25 bg-chrome p-5 text-cream shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-gold-light">{title}</h2>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-gold/25 bg-white/10 text-cream transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-gold-light" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </aside>
    </div>
  );
}
