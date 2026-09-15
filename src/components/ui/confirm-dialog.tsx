"use client";

import { Dialog } from "@/components/ui/dialog";

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
  return (
    <Dialog open={open} onClose={onCancel} widthClassName="max-w-sm">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xl" role="alertdialog" aria-modal="true">
        <p className="font-medium">{title}</p>
        <p className="mt-1.5 text-sm text-foreground-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3.5 py-1.5 text-sm text-foreground-muted transition hover:bg-surface-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: danger ? "var(--danger)" : "var(--accent)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
