"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: BottomSheetProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key & handle body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop covering everything including bottom nav and widgets */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 flex w-full max-h-[92dvh] sm:max-h-[90vh] flex-col rounded-t-[28px] sm:rounded-[24px] bg-white text-[#1D1D1F] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] sm:max-w-lg border border-slate-200/90 animate-sheet-in overflow-hidden",
          className
        )}
      >
        {/* Grab Handle for Mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-3 pb-3.5 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 id="modal-title" className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 pb-10 sm:pb-6 overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 pb-6 sm:pb-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
