"use client";

import { useState } from "react";
import { Plus, Search, UserPlus, Phone, Mail, User, Baby, Trash2, Bell } from "lucide-react";
import { createParent, updateParent, deleteParent, broadcastPWAInvitations } from "../actions";
import { RELATIONSHIP_TYPES } from "@/lib/constants";
import { toast } from "sonner";

interface ParentData {
  id: string;
  phone_wa: string;
  profiles: { full_name: string; email: string } | null;
  student_parents: any[];
}

interface StudentData {
  id: string;
  profiles: { full_name: string } | null;
  nis: string;
}

export default function ParentsClient({
  initialParents,
  students,
}: {
  initialParents: any[];
  students: any[];
}) {
  const [parents, setParents] = useState(initialParents);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParent, setEditingParent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredParents = parents.filter((p) => {
    const name = p.profiles?.full_name?.toLowerCase() || "";
    const email = p.profiles?.email?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search) || p.phone_wa.includes(search);
  });

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createParent(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.reload(); // Refresh to get updated list
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.append("id", editingParent.id);
    
    const result = await updateParent(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.reload(); // Refresh to get updated list
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data orang tua ini? Akun mereka juga akan dihapus.")) return;
    
    const result = await deleteParent(id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Berhasil menghapus orang tua.");
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Cari nama, email, atau nomor WA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 pl-10 pr-4 py-2.5 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={async () => {
              const confirm = window.confirm("Kirim undangan PWA ke semua orang tua yang belum mengaktifkan notifikasi? Pesan ini akan dikirim secara perlahan (antrean) via WhatsApp.");
              if (confirm) {
                toast.loading("Mempersiapkan pengiriman...", { id: "broadcast" });
                const res = await broadcastPWAInvitations();
                if (res.error) toast.error(res.error, { id: "broadcast" });
                else toast.success(res.message, { id: "broadcast" });
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
          >
            <Bell className="h-4 w-4" />
            <span>Kirim Undangan PWA</span>
          </button>
          
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-orange-700 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Orang Tua</span>
          </button>
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden md:block rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-stone-50 dark:bg-stone-900/60 text-stone-500 font-semibold uppercase tracking-wider text-[10px] border-b border-stone-200 dark:border-white/10">
            <tr>
              <th className="py-3 px-4">Nama Lengkap & Akun</th>
              <th className="py-3 px-4 w-48">Kontak WhatsApp</th>
              <th className="py-3 px-4">Siswa / Anak Terkait</th>
              <th className="py-3 px-4 text-right w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-white/5">
            {filteredParents.map((parent) => (
              <tr key={parent.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-stone-900 dark:text-white">{parent.profiles?.full_name}</div>
                  <div className="text-[11px] font-mono text-stone-400 flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" /> {parent.profiles?.email}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-mono font-medium text-stone-700 dark:text-stone-300">{parent.phone_wa}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    {parent.student_parents?.map((sp: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {sp.students?.profiles?.full_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                          {sp.relationship} • NIS {sp.students?.nis}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingParent(parent)}
                      className="rounded-lg p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors active:scale-[0.96]"
                      title="Edit Data"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(parent.id)}
                      className="rounded-lg p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:scale-[0.96]"
                      title="Hapus Data"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredParents.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-xs text-stone-400">
                  {searchTerm ? "Tidak ada data orang tua yang cocok" : "Belum ada data orang tua terdaftar"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Adaptive Cards */}
      <div className="md:hidden space-y-3">
        {filteredParents.map((parent) => (
          <div key={parent.id} className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 space-y-3 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">{parent.profiles?.full_name}</h4>
                <p className="text-[11px] font-mono text-stone-400 flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3" /> {parent.profiles?.email}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingParent(parent)}
                  className="rounded-lg p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(parent.id)}
                  className="rounded-lg p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <Phone className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold text-stone-700 dark:text-stone-300">{parent.phone_wa}</span>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-white/5 space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Anak Terdaftar</p>
              {parent.student_parents?.map((sp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    {sp.students?.profiles?.full_name}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    {sp.relationship} • {sp.students?.nis}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredParents.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 dark:border-white/10 bg-white dark:bg-stone-950 p-8 text-center text-xs text-stone-400">
            Tidak ada data orang tua yang ditemukan
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Tambah Orang Tua Baru</h2>
              <p className="text-sm text-muted-foreground">Lengkapi data untuk membuat akun orang tua</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input name="full_name" required className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input name="email" type="email" required className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">No. WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input name="phone_wa" required placeholder="08xxxx" className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hubungan</label>
                  <select name="relationship" required className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {RELATIONSHIP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Anak (Siswa)</label>
                <div className="relative">
                  <Baby className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select name="student_id" required className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Pilih Siswa...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.profiles?.full_name} ({s.nis})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    "Simpan Data"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Edit Data Orang Tua</h2>
              <p className="text-sm text-muted-foreground">Perbarui informasi akun orang tua</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input name="full_name" defaultValue={editingParent.profiles?.full_name} required className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input name="email" type="email" defaultValue={editingParent.profiles?.email} required className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">No. WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input name="phone_wa" defaultValue={editingParent.phone_wa} required placeholder="08xxxx" className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hubungan</label>
                  <select name="relationship" defaultValue={editingParent.student_parents?.[0]?.relationship || ""} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {RELATIONSHIP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Anak (Siswa)</label>
                <div className="relative">
                  <Baby className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select name="student_id" defaultValue={editingParent.student_parents?.[0]?.student_id || ""} required className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Pilih Siswa...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.profiles?.full_name} ({s.nis})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setEditingParent(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
