export default function NotebookLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#EBF3FC] transition-opacity duration-300">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#86868B] animate-pulse">Menyiapkan Buku Pintar Siswa...</p>
      </div>
    </div>
  );
}
