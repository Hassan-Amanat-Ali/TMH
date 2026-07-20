"use client";

import { X } from "lucide-react";
import { Button } from "./button";

export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-burgundy-dark/70 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-full max-w-sm flex-col border-l border-gold/25 bg-chrome p-5 text-cream shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-gold-light">{title}</h2>
          <Button type="button" variant="ghost" className="h-10 w-10 p-0" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </aside>
    </div>
  );
}
