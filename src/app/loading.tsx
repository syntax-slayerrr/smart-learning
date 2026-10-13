export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-[99998] bg-[#07090E] flex items-center justify-center select-none">
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center justify-center p-6 gap-6">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-48 sm:w-64 h-auto object-contain filter drop-shadow-[0_0_30px_rgba(56,189,248,0.25)]"
        >
          <source src="/assets/syntax-slayer-loading.webm" type="video/webm" />
          <source src="/assets/syntax-slayer-loading.mp4" type="video/mp4" />
        </video>
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-slate-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Memuat Sistem...
        </div>
      </div>
    </div>
  );
}
