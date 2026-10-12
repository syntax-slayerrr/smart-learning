export default function NotebookLoading() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#07090E] flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,rgba(56,189,248,0.08),rgba(139,92,246,0.05),transparent_70%)] pointer-events-none" />

      {/* Center brand glyph mark */}
      <div className="relative z-10 flex flex-col items-center space-y-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 animate-pulse" />
          <svg className="w-8 h-8 text-cyan-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-slate-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          SYNTAX SLAYER // NOTEBOOK
        </div>
      </div>
    </div>
  );
}
