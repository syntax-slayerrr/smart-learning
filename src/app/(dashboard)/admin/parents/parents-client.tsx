"use client";

import { useState } from "react";
import { Plus, Search, Phone, Mail, User, Baby, Trash2, Bell, Pencil, Loader2 } from "lucide-react";
import { createParent, updateParent, deleteParent, broadcastPWAInvitations } from "../actions";
import { RELATIONSHIP_TYPES } from "@/lib/constants";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
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
  const [parents] = useState(initialParents);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParent, setEditingParent] = useState<any>(null);
  const [deletingParent, setDeletingParent] = useState<{ id: string; name: string } | null>(null);
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
      window.location.reload();
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
      window.location.reload();
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingParent) return;
    setLoading(true);
    const result = await deleteParent(deletingParent.id);
    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Berhasil menghapus orang tua.");
      window.location.reload();
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            aria-label="Cari nama, email, atau nomor WA orang tua"
            placeholder="Cari nama, email, atau nomor WA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-input bg-card pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button
            onClick={async () => {
              const confirm = window.confirm(
                "Kirim undangan PWA ke semua orang tua yang belum mengaktifkan notifikasi? Pesan ini akan dikirim secara perlahan via WhatsApp."
              );
              if (confirm) {
                toast.loading("Mempersiapkan pengiriman...", { id: "broadcast" });
                const res = await broadcastPWAInvitations();
                if (res.error) toast.error(res.error, { id: "broadcast" });
                else toast.success(res.message, { id: "broadcast" });
              }
            }}
            className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted/70 transition-colors min-h-[44px] cursor-pointer shadow-xs"
          >
            <Bell className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate">Undangan PWA</span>
          </button>

          <button
            onClick={() => {
              setError("");
              setShowAddModal(true);
            }}
            className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover min-h-[44px] cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">Tambah Ortu</span>
          </button>
        </div>
      </div>

      {/* MOBILE CARD VIEW (Under 640px) */}
      <div className="sm:hidden space-y-3">
        {filteredParents.map((parent) => (
          <div
            key={parent.id}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3 transition-all"
          >
            {/* Header: Name, Email & Actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-foreground text-sm truncate">
                  {parent.profiles?.full_name || "Tanpa Nama"}
                </h4>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{parent.profiles?.email || "—"}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setEditingParent(parent);
                  }}
                  disabled={loading}
                  className="apple-press rounded-xl p-2.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                  title="Edit Orang Tua"
                  aria-label={`Edit ${parent.profiles?.full_name || ""}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeletingParent({
                      id: parent.id,
                      name: parent.profiles?.full_name || parent.phone_wa,
                    })
                  }
                  disabled={loading}
                  className="apple-press rounded-xl p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer disabled:opacity-50"
                  title="Hapus Orang Tua"
                  aria-label={`Hapus ${parent.profiles?.full_name || ""}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Contact WhatsApp */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 border border-border/40 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="h-3 w-3" />
                </div>
                <span className="font-mono text-foreground font-medium">{parent.phone_wa}</span>
              </div>
              <a
                href={`https://wa.me/${parent.phone_wa.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                Chat WA ↗
              </a>
            </div>

            {/* Linked Students & Relationship */}
            <div className="pt-1 border-t border-border/50 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Siswa Terhubung:
              </p>
              {parent.student_parents && parent.student_parents.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {parent.student_parents.map((sp: any, idx: number) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs border border-border/40"
                    >
                      <span className="font-semibold text-foreground">
                        {sp.students?.profiles?.full_name || "Siswa"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({sp.relationship} • NIS {sp.students?.nis})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Belum ada siswa terhubung
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredParents.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
            Tidak ada data orang tua ditemukan
          </div>
        )}
      </div>

      {/* DESKTOP TABLE (640px and up) */}
      <div className="hidden sm:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-3.5">Nama & Akun</th>
                <th className="px-6 py-3.5">Kontak</th>
                <th className="px-6 py-3.5">Anak & Hubungan</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredParents.map((parent) => (
                <tr key={parent.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{parent.profiles?.full_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" /> {parent.profiles?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Phone className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-mono text-xs">{parent.phone_wa}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {parent.student_parents?.map((sp: any, idx: number) => (
                        <div key={idx} className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {sp.students?.profiles?.full_name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium font-mono">
                            {sp.relationship} • NIS {sp.students?.nis}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setError("");
                          setEditingParent(parent);
                        }}
                        disabled={loading}
                        className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                        title="Edit Orang Tua"
                        aria-label={`Edit ${parent.profiles?.full_name || ""}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeletingParent({
                            id: parent.id,
                            name: parent.profiles?.full_name || parent.phone_wa,
                          })
                        }
                        disabled={loading}
                        className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer disabled:opacity-50"
                        title="Hapus Orang Tua"
                        aria-label={`Hapus ${parent.profiles?.full_name || ""}`}
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
      </div>

      {/* Modal Tambah Orang Tua */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => {
          if (!loading) {
            setShowAddModal(false);
            setError("");
          }
        }}
        title="Tambah Orang Tua Baru"
        description="Lengkapi data untuk membuat akun wali murid dan menghubungkannya dengan siswa."
      >
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="add-parent-name" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Nama Lengkap
              </label>
              <input
                id="add-parent-name"
                name="full_name"
                required
                placeholder="Nama orang tua/wali"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="add-parent-email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
              </label>
              <input
                id="add-parent-email"
                name="email"
                type="email"
                required
                placeholder="email@example.com"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="add-parent-phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> No. WhatsApp
              </label>
              <input
                id="add-parent-phone"
                name="phone_wa"
                required
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="add-parent-rel" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                Hubungan
              </label>
              <select
                id="add-parent-rel"
                name="relationship"
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {RELATIONSHIP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-parent-student" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Baby className="h-3.5 w-3.5 text-muted-foreground" /> Anak (Siswa)
            </label>
            <select
              id="add-parent-student"
              name="student_id"
              required
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">— Pilih Siswa —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.profiles?.full_name} ({s.nis})
                </option>
              ))}
            </select>
          </div>

          <div className="flex w-full items-center justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setShowAddModal(false);
                setError("");
              }}
              className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Simpan Data</span>
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Modal Edit Orang Tua */}
      <BottomSheet
        isOpen={Boolean(editingParent)}
        onClose={() => {
          if (!loading) {
            setEditingParent(null);
            setError("");
          }
        }}
        title="Edit Data Orang Tua"
        description="Perbarui informasi profil atau data kontak wali murid."
      >
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        {editingParent && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-parent-name" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Nama Lengkap
                </label>
                <input
                  id="edit-parent-name"
                  name="full_name"
                  defaultValue={editingParent.profiles?.full_name}
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-parent-email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
                </label>
                <input
                  id="edit-parent-email"
                  name="email"
                  type="email"
                  defaultValue={editingParent.profiles?.email}
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-parent-phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> No. WhatsApp
                </label>
                <input
                  id="edit-parent-phone"
                  name="phone_wa"
                  defaultValue={editingParent.phone_wa}
                  required
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-parent-rel" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  Hubungan
                </label>
                <select
                  id="edit-parent-rel"
                  name="relationship"
                  defaultValue={editingParent.student_parents?.[0]?.relationship || ""}
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {RELATIONSHIP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-parent-student" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Baby className="h-3.5 w-3.5 text-muted-foreground" /> Anak (Siswa)
              </label>
              <select
                id="edit-parent-student"
                name="student_id"
                defaultValue={editingParent.student_parents?.[0]?.student_id || ""}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Pilih Siswa —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.profiles?.full_name} ({s.nis})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex w-full items-center justify-end gap-2.5 pt-4 border-t border-border">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setEditingParent(null);
                  setError("");
                }}
                className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Perbarui Data</span>
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* Dialog Konfirmasi Hapus */}
      <DeleteConfirmDialog
        isOpen={Boolean(deletingParent)}
        onClose={() => setDeletingParent(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deletingParent?.name}
        isPending={loading}
        title="Hapus Data Orang Tua"
        description={`Apakah Anda yakin ingin menghapus data orang tua "${deletingParent?.name}"? Akun wali murid dan keterhubungan dengan siswa akan dihapus permanen.`}
      />
    </div>
  );
}
