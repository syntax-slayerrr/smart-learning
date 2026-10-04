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
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama, email, atau nomor WA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
          <button
            onClick={async () => {
              const confirm = window.confirm("Kirim undangan PWA ke semua orang tua yang belum mengaktifkan notifikasi? Pesan ini akan dikirim secara perlahan (antrean) via WhatsApp.");
              if (confirm) {
                toast.loading("Mempersiapkan pengiriman...", { id: "broadcast" });
                const res = await broadcastPWAInvitations();
                if (res.error) toast.error(res.error, { id: "broadcast" });
                else toast.success(res.message, { id: "broadcast" });
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Bell className="h-4 w-4" />
            Kirim Undangan PWA
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Orang Tua
          </button>
        </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
            <tr>
              <th className="px-6 py-4">Nama & Akun</th>
              <th className="px-6 py-4">Kontak</th>
              <th className="px-6 py-4">Anak & Hubungan</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredParents.map((parent) => (
              <tr key={parent.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-foreground">{parent.profiles?.full_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {parent.profiles?.email}
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span>{parent.phone_wa}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {parent.student_parents?.map((sp: any, idx: number) => (
                      <div key={idx} className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {sp.students?.profiles?.full_name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          {sp.relationship} • NIS {sp.students?.nis}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingParent(parent)}
                      className="p-2 text-muted-foreground hover:text-blue-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(parent.id)}
                      className="p-2 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredParents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  Tidak ada data orang tua ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
