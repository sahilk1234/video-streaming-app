"use client";

import { cn } from "@/lib/utils";

export default function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className={cn("text-lg font-semibold text-text", !title && "sr-only")}>{title}</h3>
          <button onClick={onClose} className="text-sm text-muted hover:text-text">
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
