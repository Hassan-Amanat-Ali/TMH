"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>("[data-modal-root] button, [data-modal-root] a, [data-modal-root] input, [data-modal-root] select, [data-modal-root] textarea")).filter((node) => !node.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-burgundy-dark/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div data-modal-root className={cn("w-full max-w-lg rounded-3xl border border-gold/25 bg-cream p-6 text-ink shadow-soft")}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-bold text-burgundy-dark">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-full p-2 text-mauve-dark hover:bg-cream-200" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
