"use client";

import { Dialog } from "@/components/ui/dialog";
import { useId } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
  danger = true,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  const messageId = useId();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      widthClassName="max-w-sm"
      ariaLabel={title}
      ariaDescribedBy={messageId}
      role="alertdialog"
    >
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <p className="font-medium">{title}</p>
        <p id={messageId} className="mt-1.5 text-sm text-foreground-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-border px-3.5 py-1.5 text-sm text-foreground-muted transition hover:bg-surface-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-lg px-3.5 py-1.5 text-sm font-medium text-on-accent transition hover:opacity-90"
            style={{ background: danger ? "var(--danger)" : "var(--accent)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
