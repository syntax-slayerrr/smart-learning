"use client";

import React, { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface SearchPillProps {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  onFilterClick?: () => void;
  className?: string;
}

export function SearchPill({
  placeholder = "Cari siswa, kelas, guru, atau modul...",
  value: controlledValue,
  onChange,
  onFilterClick,
  className = "",
}: SearchPillProps) {
  const [internalValue, setInternalValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const val = isControlled ? controlledValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    if (!isControlled) {
      setInternalValue(nextVal);
    }
    onChange?.(nextVal);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
  };

  return (
    <div
      className={`search-pill-3d relative flex items-center h-12 w-full px-3.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/40 ${className}`}
    >
      {/* Search Icon */}
      <div className="flex items-center justify-center text-slate-400 pl-0.5 pr-2.5">
        <Search className="h-[18px] w-[18px] stroke-[1.8]" />
      </div>

      {/* Input Field */}
      <input
        type="text"
        value={val}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none tracking-normal font-normal"
      />

      {/* Clear Button (if text exists) */}
      {val && (
        <button
          type="button"
          onClick={handleClear}
          className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/80 text-slate-500 hover:bg-slate-300 transition-colors"
          aria-label="Hapus pencarian"
        >
          <X className="h-3 w-3 stroke-[2]" />
        </button>
      )}

      {/* Filter / Slider Pill Button */}
      {onFilterClick && (
        <button
          type="button"
          onClick={onFilterClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200/80 active:scale-95 transition-all"
          aria-label="Filter"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 stroke-[1.8]" />
        </button>
      )}
    </div>
  );
}
