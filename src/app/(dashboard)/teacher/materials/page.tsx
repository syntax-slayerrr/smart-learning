"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Users,
  Eye,
  Plus,
  X,
  Loader2,
  BrainCircuit,
  Lightbulb,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface MaterialItem {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size_bytes?: number;
  page_count?: number;
  ai_summary?: string;
  ai_status?: string;
  created_at?: string;
  subjects?: {
    id: string;
    name: string;
    code: string;
  };
  classes?: {
    id: string;
    name: string;
  };
}

interface OptionItem {
  id: string;
  name: string;
  code?: string;
}

export default function TeacherMaterialsPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active AI Preview Modal
  const [activePreviewMaterial, setActivePreviewMaterial] = useState<MaterialItem | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [matRes, optRes] = await Promise.all([
        fetch("/api/lms/materials"),
        fetch("/api/lms/options"),
      ]);

      const matJson = await matRes.json();
      const optJson = await optRes.json();

      if (matJson.success) {
        setMaterials(matJson.data || []);
      }
      if (optJson.success) {
        setSubjects(optJson.subjects || []);
        setClasses(optJson.classes || []);
        if (optJson.subjects?.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(optJson.subjects[0].id);
        }
        if (optJson.classes?.length > 0 && !selectedClassId) {
          setSelectedClassId(optJson.classes[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading materials:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setUploadError("Hanya berkas berformat PDF yang diperbolehkan.");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setUploadError("Ukuran berkas maksimal adalah 25MB.");
        return;
      }
      setUploadError(null);
      setSelectedFile(file);
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        setTitle(cleanName);
      }
    }
  };

  const handleUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Silakan pilih berkas dokumen PDF terlebih dahulu.");
      return;
    }
    if (!title.trim()) {
      setUploadError("Judul materi wajib diisi.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Upload file to Supabase Storage
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder", "materials");

      const uploadRes = await fetch("/api/lms/upload", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();

      if (!uploadJson.success) {
        throw new Error(uploadJson.error || "Gagal mengunggah berkas ke storage.");
      }

      // 2. Save material metadata to database
      const saveRes = await fetch("/api/lms/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subjectId: selectedSubjectId || (subjects[0]?.id ?? null),
          classId: selectedClassId || (classes[0]?.id ?? null),
          description,
          fileUrl: uploadJson.fileUrl,
          fileName: uploadJson.fileName,
          fileSizeBytes: uploadJson.fileSize,
          pageCount: uploadJson.pageCount || 20,
        }),
      });
      const saveJson = await saveRes.json();

      if (!saveJson.success) {
        throw new Error(saveJson.error || "Gagal menyimpan data materi.");
      }

      // Reset and refresh
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Terjadi kesalahan saat memproses materi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus materi ini?")) return;
    try {
      const res = await fetch(`/api/lms/materials?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "PDF";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <PageHeader
        eyebrow="KURIKULUM & MATERI AJAR"
        title="Modul Materi & Dokumen Pembelajaran"
        description="Unggah berkas modul resmi berformat PDF untuk siswa dan analisis konsep secara otomatis dengan Smart AI."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-9 px-3 gap-1.5 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(true);
                setUploadError(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 gap-1.5 shadow-xs rounded-xl"
            >
              <Plus className="h-4 w-4" />
              <span>Unggah Modul Baru (PDF)</span>
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards - Apple Ceramic Minimalist */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Modul Aktif
            </span>
            <span className="text-xl font-black text-slate-900 font-mono tracking-tight block">
              {materials.length} Dokumen
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Tersimpan di Supabase Storage</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              AI Terindeks
            </span>
            <span className="text-xl font-black text-emerald-600 font-mono tracking-tight block">
              {materials.filter((m) => m.ai_status === "completed" || m.ai_summary).length} / {materials.length || 0}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Siap untuk Smart Notebook</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Mata Pelajaran Terhubung
            </span>
            <span className="text-xl font-black text-slate-900 font-mono tracking-tight block">
              {subjects.length} Mapel
            </span>
            <span className="text-[10px] text-slate-400 font-medium">TKJ & RPL Terintegrasi</span>
          </div>
        </div>
      </div>

      {/* Materials List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600" />
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate-600 font-bold">
              Daftar Dokumen Materi Pembelajaran
            </h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 border border-slate-200">
              {materials.length} File
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Memuat data dokumen materi dari database...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <h5 className="text-sm font-bold text-slate-700">Belum Ada Materi Pembelajaran</h5>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Silakan klik tombol "Unggah Modul Baru" untuk mengunggah dokumen PDF materi pertama Anda.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 rounded-xl"
            >
              Unggah Modul Sekarang
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 transition-all space-y-3.5"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100/80 shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-sm font-bold text-slate-900 leading-snug truncate">
                        {item.title}
                      </h5>
                      <p className="text-xs text-slate-500 truncate">
                        {item.subjects?.name || "Mata Pelajaran Umum"} • {item.classes?.name || "Semua Kelas"}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={item.ai_summary ? "success" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {item.ai_summary ? "AI Terindeks" : "Tersimpan"}
                  </Badge>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Format</span>
                    <span className="text-xs font-bold text-slate-800">PDF Asli</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Ukuran File</span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatFileSize(item.file_size_bytes)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">AI Dialektik</span>
                    <span className="text-xs font-bold text-emerald-600">Aktif</span>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px] truncate max-w-[150px]">
                    {item.file_name || "modul.pdf"}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.ai_summary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActivePreviewMaterial(item)}
                        className="text-xs h-8 px-2.5 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        <BrainCircuit className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                        <span>Ringkasan AI</span>
                      </Button>
                    )}
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Buka PDF</span>
                      </Button>
                    </a>
                    <button
                      onClick={() => handleDeleteMaterial(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Modul"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal (Apple HIG Style) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Unggah Modul Pembelajaran (PDF)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Berkas akan diunggah ke storage aman dan otomatis dipetakan oleh AI.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadAndSave} className="space-y-3.5">
              {/* File Dropzone */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Pilih Berkas Dokumen PDF <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-slate-200 hover:border-blue-400 bg-slate-50/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-800">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      <span className="text-xs font-semibold truncate max-w-xs">{selectedFile.name}</span>
                      <span className="text-[10px] text-emerald-600">({formatFileSize(selectedFile.size)})</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="h-6 w-6 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-600 font-medium">
                        Klik untuk memilih berkas PDF dari komputer Anda
                      </p>
                      <p className="text-[10px] text-slate-400">Maksimal 25MB • Format resmi PDF</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Judul Modul Pembelajaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Modul Administrasi Jaringan Komputer & Subnetting IPv4"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Subject & Class Select */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kelas Sasaran
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Deskripsi / Petunjuk Baca (Opsional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Catatan pengantar bagi siswa sebelum mempelajari modul..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs h-9 rounded-xl"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isUploading}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!selectedFile || !title.trim() || isUploading}
                  className="text-xs h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengunggah & Memproses AI...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Simpan & Publikasikan Dokumen</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Summary View Modal */}
      {activePreviewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ringkasan Konseptual AI
                  </h3>
                  <p className="text-[11px] text-slate-500">{activePreviewMaterial.title}</p>
                </div>
              </div>
              <button
                onClick={() => setActivePreviewMaterial(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs text-slate-700 leading-relaxed max-h-80 overflow-y-auto space-y-2">
              <p className="font-medium text-slate-900">Hasil Analisis Otomatis Dokumen:</p>
              <p className="whitespace-pre-wrap">{activePreviewMaterial.ai_summary}</p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <a
                href={activePreviewMaterial.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Buka PDF Sumber</span>
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivePreviewMaterial(null)}
                className="text-xs h-8 px-4 rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
