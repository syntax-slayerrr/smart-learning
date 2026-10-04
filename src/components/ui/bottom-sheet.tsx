"use client";

import * as React from "react";
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
  // Close on Escape key
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 flex w-full max-h-[90vh] flex-col rounded-t-[28px] sm:rounded-[24px] bg-white text-[#1D1D1F] shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:max-w-lg border border-[rgba(60,60,67,0.12)] animate-in slide-in-from-bottom duration-250 ease-out overflow-hidden",
          className
        )}
      >
        {/* Grab Handle for Mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-[#D1D1D6]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-4 pb-3 border-b border-[rgba(60,60,67,0.08)]">
          <div className="space-y-0.5">
            <h2 id="modal-title" className="text-base sm:text-lg font-semibold tracking-tight text-[#1D1D1F]">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-[#6E6E73]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full bg-[#F2F2F0] text-[#6E6E73] hover:bg-[#E5E5EA] hover:text-[#1D1D1F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[rgba(60,60,67,0.08)] bg-[#FBFBFA]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
