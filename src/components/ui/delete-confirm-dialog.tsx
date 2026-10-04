"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  itemName?: string;
  isPending?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Hapus",
  description,
  itemName,
  isPending = false,
}: DeleteConfirmDialogProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title={title}
      description={
        description ||
        `Apakah Anda yakin ingin menghapus ${itemName ? `"${itemName}"` : "data ini"}? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 min-h-[44px] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-destructive px-5 py-2.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm disabled:opacity-50 min-h-[44px] cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Ya, Hapus Data</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="leading-relaxed">
          Semua catatan riwayat, relasi data, atau keterkaitan dengan entitas ini akan ikut terpengaruh. Pastikan Anda telah memeriksa kembali data yang akan dihapus.
        </p>
      </div>
    </BottomSheet>
  );
}
