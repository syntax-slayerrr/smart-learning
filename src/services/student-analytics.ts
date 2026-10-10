import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ==============================================================================
// LAYANAN ANALITIK KETERLIBATAN SISWA & DINAMIKA KELAS (STUDENT ANALYTICS SERVICE)
// ==============================================================================
// Tim: SYNTAX SLAYER (Smart Learning Platform)
// Arsitektur: Algoritma Skoring Komposit & Optimasi Struktur Data Hash Map O(N)
//
// Modul ini memproses data telemetri spatio-temporal dari Edge CV Engine
// dan catatan absensi untuk mendeteksi siswa berisiko (At-Risk Students),
// mengukur dinamika fokus pembelajaran, serta menghasilkan laporan untuk
// Admin, Guru, dan Orang Tua.
// ==============================================================================

export interface StudentEngagementProfile {
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  attendance_rate: number;
  total_sessions_attended: number;
  total_sessions: number;
  sleep_incidents: number;
  avg_participation_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  recent_sleep_sessions: { session_date: string; subject: string; count: number }[];
}

export interface SessionDynamicsData {
  session_id: string;
  subject_name: string;
  class_name: string;
  session_date: string;
  status: string;
  timeline: {
    timestamp: string;
    sitting: number;
    standing: number;
    hand_raises: number;
    desk_focused: number;
    sleep_detected: number;
    teacher_zone: string | null;
  }[];
  totals: {
    avg_students: number;
    total_hand_raises: number;
    total_sleep_incidents: number;
    avg_sitting_pct: number;
    avg_desk_focused_pct: number;
    peak_sleep_count: number;
  };
  insights: {
    id: string;
    type: string;
    summary: string;
    prompt: string;
    confidence: string;
    reviewed: boolean;
  }[];
}

export interface StudentRiskItem {
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  attendance_rate: number;
  absent_count: number;
  sleep_incidents: number;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
}

export interface SchoolOverview {
  total_sessions_with_telemetry: number;
  total_sleep_incidents: number;
  avg_hand_raises_per_session: number;
  classes_with_highest_sleep: { class_name: string; count: number }[];
  at_risk_students: StudentRiskItem[];
  recent_sleep_alerts: {
    session_date: string;
    subject: string;
    class_name: string;
    sleep_count: number;
  }[];
}

/**
 * Algoritma Penentuan Kategori Tingkat Risiko Siswa (Decision Boundary Partitioning).
 *
 * Analisis Algoritma:
 * -------------------
 * - Masukan: Skor Komposit Ri (rentang 0.00 hingga 1.00).
 * - Kompleksitas Waktu: O(1)
 * - Kompleksitas Ruang: O(1)
 *
 * Batas Kategori:
 * - >= 0.75 : "critical" (Butuh Intervensi Segera: Notifikasi WhatsApp Otomatis ke Orang Tua)
 * - >= 0.50 : "high"     (Tingkat Kehadiran Rendah atau Sering Tidur di Jam Pelajaran)
 * - >= 0.25 : "medium"   (Peringatan Dini untuk Guru Wali Kelas)
 * - < 0.25  : "low"      (Aman / Pembelajaran Normal)
 */
export function hitungTingkatRisiko(skorKomposit: number): "low" | "medium" | "high" | "critical" {
  if (skorKomposit >= 0.75) return "critical";
  if (skorKomposit >= 0.5) return "high";
  if (skorKomposit >= 0.25) return "medium";
  return "low";
}

// Alias kompatibilitas
export const computeRiskLevel = hitungTingkatRisiko;

/**
 * Mengambil dan menghitung dinamika sesi pembelajaran secara time-series.
 *
 * Analisis Struktur Data & Algoritma:
 * ----------------------------------
 * - Struktur Data: Time-Series Array dengan reduksi akumulator O(T) single-pass.
 * - Kompleksitas Waktu: O(T + I) di mana T adalah panjang timeline telemetri dan I adalah jumlah insight.
 * - Kompleksitas Ruang: O(T) alokasi memori linear.
 */
export async function ambilDinamikaSesi(idSesi: string): Promise<SessionDynamicsData | null> {
  const adminClient = createAdminClient();

  const { data: sesi } = await adminClient
    .from("attendance_sessions")
    .select("id, session_date, status, subjects(name), classes(name)")
    .eq("id", idSesi)
    .maybeSingle();

  if (!sesi) return null;

  const [hasilTelemetri, hasilInsight] = await Promise.all([
    adminClient
      .from("classroom_telemetry")
      .select("*")
      .eq("session_id", idSesi)
      .order("timestamp_bucket", { ascending: true })
      .limit(200),
    adminClient
      .from("pedagogical_insights")
      .select("*")
      .eq("session_id", idSesi)
      .order("created_at", { ascending: false }),
  ]);

  const daftarTelemetri = hasilTelemetri.data || [];
  const daftarInsight = hasilInsight.data || [];

  // Single-pass Reduksi Agregat
  let totalSiswaTerdeteksi = 0;
  let totalAngkatTangan = 0;
  let totalInsidenTidur = 0;
  let totalDuduk = 0;
  let totalFokusMeja = 0;
  let puncakTidur = 0;

  const timeline = daftarTelemetri.map((rekaman: Record<string, unknown>) => {
    const siswaCount = (rekaman.detected_students_count as number) || 0;
    const angkatCount = (rekaman.hand_raise_count as number) || 0;
    const tidurCount = (rekaman.sleep_detected_count as number) || 0;
    const dudukCount = (rekaman.sitting_count as number) || 0;
    const mejaCount = (rekaman.desk_focused_count as number) || 0;

    totalSiswaTerdeteksi += siswaCount;
    totalAngkatTangan += angkatCount;
    totalInsidenTidur += tidurCount;
    totalDuduk += dudukCount;
    totalFokusMeja += mejaCount;
    if (tidurCount > puncakTidur) puncakTidur = tidurCount;

    return {
      timestamp: rekaman.timestamp_bucket as string,
      sitting: dudukCount,
      standing: (rekaman.standing_count as number) || 0,
      hand_raises: angkatCount,
      desk_focused: mejaCount,
      sleep_detected: tidurCount,
      teacher_zone: (rekaman.teacher_zone as string) || null,
    };
  });

  const totalIrisanWaktu = timeline.length;
  const rataRataSiswa = totalIrisanWaktu > 0 ? Math.round(totalSiswaTerdeteksi / totalIrisanWaktu) : 0;
  const persentaseDuduk = totalIrisanWaktu > 0 && totalSiswaTerdeteksi > 0
    ? Math.round((totalDuduk / totalSiswaTerdeteksi) * 100)
    : 0;
  const persentaseFokusMeja = totalIrisanWaktu > 0 && totalSiswaTerdeteksi > 0
    ? Math.round((totalFokusMeja / totalSiswaTerdeteksi) * 100)
    : 0;

  return {
    session_id: idSesi,
    subject_name: (sesi.subjects as any)?.name || "—",
    class_name: (sesi.classes as any)?.name || "—",
    session_date: sesi.session_date,
    status: sesi.status,
    timeline,
    totals: {
      avg_students: rataRataSiswa,
      total_hand_raises: totalAngkatTangan,
      total_sleep_incidents: totalInsidenTidur,
      avg_sitting_pct: persentaseDuduk,
      avg_desk_focused_pct: persentaseFokusMeja,
      peak_sleep_count: puncakTidur,
    },
    insights: daftarInsight.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      type: item.insight_type as string,
      summary: item.observation_summary as string,
      prompt: item.pedagogical_prompt as string,
      confidence: item.confidence_level as string,
      reviewed: (item.is_reviewed_by_teacher as boolean) || false,
    })),
  };
}

// Alias kompatibilitas
export const getSessionDynamics = ambilDinamikaSesi;

/**
 * Algoritma Identifikasi Siswa Berisiko (Composite Student Risk Scoring Algorithm).
 *
 * Analisis Struktur Data & Algoritma:
 * ----------------------------------
 * - Formula Matematis Komposit:
 *     Skor_Risiko = w1 * (1 - Rasio_Kehadiran) + w2 * Frekuensi_Tidur
 *     di mana w1 = 0.60 (Bobot Ketidakhadiran), w2 = 0.40 (Bobot Kelelahan/Tertidur).
 * - Optimasi Struktur Data:
 *     1. Menggunakan Hash Map (Map<string, CatatanStatistik>) untuk agregasi catatan absensi.
 *        Kompleksitas pra-pemrosesan: O(R) di mana R adalah total baris absensi.
 *     2. Menggunakan Hash Map (Map<string, number>) untuk agregasi insiden tidur per kelas.
 *        Kompleksitas pra-pemrosesan: O(P) di mana P adalah total sesi telemetri tidur.
 *     3. Menggunakan Pencarian Hash Map O(1) konstan saat memetakan N siswa.
 * - Perbandingan Kompleksitas:
 *     - Algoritma Naif: O(N * R + N * P) -> Quadratic Bottleneck
 *     - Algoritma Teroptimasi Ini: O(N + R + P) -> Linear Time Optimal
 */
export async function ambilSiswaBerisiko(opsi?: {
  classId?: string;
  teacherId?: string;
  limit?: number;
}): Promise<StudentRiskItem[]> {
  const adminClient = createAdminClient();
  const batasJumlah = opsi?.limit || 20;

  // 1. Ambil seluruh profil siswa yang sesuai filter
  let querySiswa = adminClient
    .from("students")
    .select("id, nis, class_id, profiles(full_name), classes(name)");

  if (opsi?.classId) {
    querySiswa = querySiswa.eq("class_id", opsi.classId);
  }

  const { data: daftarSiswa } = await querySiswa;
  if (!daftarSiswa || daftarSiswa.length === 0) return [];

  const daftarIdSiswa = daftarSiswa.map((s: Record<string, unknown>) => s.id as string);

  // 2. Ambil catatan absensi dan telemetri tidur secara paralel
  const [hasilAbsensi, hasilTelemetriTidur] = await Promise.all([
    adminClient
      .from("attendance_records")
      .select("student_id, status")
      .in("student_id", daftarIdSiswa),
    adminClient
      .from("classroom_telemetry")
      .select("session_id, sleep_detected_count, attendance_sessions(class_id, session_date)")
      .gt("sleep_detected_count", 0)
      .limit(500),
  ]);

  const catatanAbsensi = hasilAbsensi.data || [];
  const sesiTidur = hasilTelemetriTidur.data || [];

  // ============================================================================
  // Optimasi DSA 1: Hash Map Bucket untuk Catatan Absensi Per Siswa O(R)
  // ============================================================================
  const petaAbsensiSiswa = new Map<string, { total: number; hadir: number; alpa: number }>();
  for (const baris of catatanAbsensi) {
    const idS = baris.student_id as string;
    const dataAda = petaAbsensiSiswa.get(idS) || { total: 0, hadir: 0, alpa: 0 };
    dataAda.total += 1;
    if (baris.status === "present" || baris.status === "late") {
      dataAda.hadir += 1;
    } else if (baris.status === "absent") {
      dataAda.alpa += 1;
    }
    petaAbsensiSiswa.set(idS, dataAda);
  }

  // ============================================================================
  // Optimasi DSA 2: Hash Map Bucket untuk Akumulasi Insiden Tidur Per Kelas O(P)
  // ============================================================================
  const petaTidurPerKelas = new Map<string, number>();
  for (const rekamanTidur of sesiTidur) {
    const rawSesi = rekamanTidur.attendance_sessions as unknown;
    const dataSesi = Array.isArray(rawSesi) ? (rawSesi[0] as Record<string, unknown> | undefined) : (rawSesi as Record<string, unknown> | null);
    const idKelas = dataSesi?.class_id as string | undefined;
    if (idKelas) {
      const hitunganSaatIni = petaTidurPerKelas.get(idKelas) || 0;
      petaTidurPerKelas.set(idKelas, hitunganSaatIni + ((rekamanTidur.sleep_detected_count as number) || 0));
    }
  }

  // ============================================================================
  // Optimasi DSA 3: Perhitungan Skor Risiko Komposit Linear O(N) dengan O(1) Lookups
  // ============================================================================
  const hasilSkoring: StudentRiskItem[] = daftarSiswa.map((siswa: Record<string, unknown>) => {
    const idSiswa = siswa.id as string;
    const idKelas = siswa.class_id as string;

    const dataAbsensi = petaAbsensiSiswa.get(idSiswa) || { total: 0, hadir: 0, alpa: 0 };
    const rasioKehadiran = dataAbsensi.total > 0 ? dataAbsensi.hadir / dataAbsensi.total : 1.0;

    const insidenTidurKelas = petaTidurPerKelas.get(idKelas) || 0;
    const frekuensiTidurTernormalisasi = Math.min(insidenTidurKelas / Math.max(dataAbsensi.total, 1), 1.0);

    // Rumus Skoring Komposit Terbobot:
    const bobotKehadiran = 0.60;
    const bobotTidur = 0.40;
    const skorRisiko = bobotKehadiran * (1.0 - rasioKehadiran) + bobotTidur * frekuensiTidurTernormalisasi;

    return {
      student_id: idSiswa,
      student_name: ((siswa.profiles as any)?.full_name as string) || "—",
      nis: siswa.nis as string,
      class_name: ((siswa.classes as any)?.name as string) || "—",
      attendance_rate: Math.round(rasioKehadiran * 100),
      absent_count: dataAbsensi.alpa,
      sleep_incidents: insidenTidurKelas,
      risk_score: Math.round(skorRisiko * 100) / 100,
      risk_level: hitungTingkatRisiko(skorRisiko),
    };
  });

  // Urutkan siswa berisiko tertinggi (Descending) dan ambil batas N teratas
  return hasilSkoring
    .filter((item) => item.risk_level !== "low")
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, batasJumlah);
}

// Alias kompatibilitas
export const getAtRiskStudents = ambilSiswaBerisiko;

/**
 * Mengambil ringkasan analitik seluruh sesi pembelajaran seorang guru.
 */
export async function ambilAnalitikSesiGuru(idGuru: string) {
  const adminClient = createAdminClient();

  const { data: daftarSesi } = await adminClient
    .from("attendance_sessions")
    .select("id, session_date, status, subjects(name), classes(name)")
    .eq("teacher_id", idGuru)
    .order("session_date", { ascending: false })
    .limit(30);

  if (!daftarSesi || daftarSesi.length === 0) {
    return {
      total_sessions: 0,
      sessions_with_telemetry: 0,
      total_sleep_alerts: 0,
      total_hand_raises: 0,
      recent_sessions: [],
    };
  }

  const daftarIdSesi = daftarSesi.map((s: Record<string, unknown>) => s.id as string);

  const { data: telemetri } = await adminClient
    .from("classroom_telemetry")
    .select("session_id, hand_raise_count, sleep_detected_count")
    .in("session_id", daftarIdSesi);

  // Hash Map Aggregation per Session
  const petaStatistikSesi = new Map<string, { angkatTangan: number; tidurCount: number }>();
  (telemetri || []).forEach((baris: Record<string, unknown>) => {
    const idS = baris.session_id as string;
    const ada = petaStatistikSesi.get(idS) || { angkatTangan: 0, tidurCount: 0 };
    ada.angkatTangan += (baris.hand_raise_count as number) || 0;
    ada.tidurCount += (baris.sleep_detected_count as number) || 0;
    petaStatistikSesi.set(idS, ada);
  });

  let totalPeringatanTidur = 0;
  let totalAngkatTangan = 0;
  for (const stat of petaStatistikSesi.values()) {
    totalPeringatanTidur += stat.tidurCount;
    totalAngkatTangan += stat.angkatTangan;
  }

  const sesiTerkini = daftarSesi.slice(0, 10).map((s: Record<string, unknown>) => {
    const dataStat = petaStatistikSesi.get(s.id as string);
    return {
      id: s.id as string,
      date: s.session_date as string,
      subject: (s.subjects as any)?.name || "—",
      class_name: (s.classes as any)?.name || "—",
      has_telemetry: !!dataStat,
      hand_raises: dataStat?.angkatTangan || 0,
      sleep_incidents: dataStat?.tidurCount || 0,
    };
  });

  return {
    total_sessions: daftarSesi.length,
    sessions_with_telemetry: petaStatistikSesi.size,
    total_sleep_alerts: totalPeringatanTidur,
    total_hand_raises: totalAngkatTangan,
    recent_sessions: sesiTerkini,
  };
}

// Alias kompatibilitas
export const getTeacherSessionsAnalytics = ambilAnalitikSesiGuru;

/**
 * Mengambil ikhtisar metrik ruang kelas seluruh sekolah untuk Dashboard Admin.
 */
export async function ambilRingkasanSekolah(): Promise<SchoolOverview> {
  const adminClient = createAdminClient();

  const { data: seluruhTelemetri } = await adminClient
    .from("classroom_telemetry")
    .select("session_id, hand_raise_count, sleep_detected_count, attendance_sessions(session_date, classes(name), subjects(name))")
    .order("created_at", { ascending: false })
    .limit(1000);

  const daftarSesiUnik = new Set<string>();
  let totalInsidenTidurSekolah = 0;
  let totalAngkatTanganSekolah = 0;
  const petaTidurPerKelas = new Map<string, number>();

  for (const baris of seluruhTelemetri || []) {
    daftarSesiUnik.add(baris.session_id as string);
    const tidur = (baris.sleep_detected_count as number) || 0;
    const angkat = (baris.hand_raise_count as number) || 0;
    totalInsidenTidurSekolah += tidur;
    totalAngkatTanganSekolah += angkat;

    if (tidur > 0) {
      const rawSesi = baris.attendance_sessions as unknown;
      const sesi = Array.isArray(rawSesi) ? (rawSesi[0] as Record<string, unknown> | undefined) : (rawSesi as Record<string, unknown> | null);
      const namaKelas = (sesi?.classes as any)?.name || "Kelas Lainnya";
      petaTidurPerKelas.set(namaKelas, (petaTidurPerKelas.get(namaKelas) || 0) + tidur);
    }
  }

  const kelasTidurTertinggi = Array.from(petaTidurPerKelas.entries())
    .map(([class_name, count]) => ({ class_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const peringatanTidurTerkini = (seluruhTelemetri || [])
    .filter((b: Record<string, unknown>) => ((b.sleep_detected_count as number) || 0) > 0)
    .slice(0, 10)
    .map((b: Record<string, unknown>) => {
      const rawSesi = b.attendance_sessions as unknown;
      const sesi = Array.isArray(rawSesi) ? (rawSesi[0] as Record<string, unknown> | undefined) : (rawSesi as Record<string, unknown> | null);
      return {
        session_date: (sesi?.session_date as string) || "—",
        subject: ((sesi?.subjects as any)?.name as string) || "—",
        class_name: ((sesi?.classes as any)?.name as string) || "—",
        sleep_count: (b.sleep_detected_count as number) || 0,
      };
    });

  const siswaBerisiko = await ambilSiswaBerisiko({ limit: 10 });

  return {
    total_sessions_with_telemetry: daftarSesiUnik.size,
    total_sleep_incidents: totalInsidenTidurSekolah,
    avg_hand_raises_per_session: daftarSesiUnik.size > 0 ? Math.round(totalAngkatTanganSekolah / daftarSesiUnik.size) : 0,
    classes_with_highest_sleep: kelasTidurTertinggi,
    at_risk_students: siswaBerisiko,
    recent_sleep_alerts: peringatanTidurTerkini,
  };
}

// Alias kompatibilitas
export const getSchoolOverview = ambilRingkasanSekolah;

/**
 * Mengambil data keterlibatan anak untuk portal Orang Tua (Parent Dashboard).
 * Dioptimalkan dengan Batching Database Queries untuk mengeliminasi N+1 Problem.
 */
export async function ambilKeterlibatanAnak(idOrangTua: string) {
  const adminClient = createAdminClient();

  // 1. Ambil relasi anak dari tabel student_parents
  const { data: daftarTautan } = await adminClient
    .from("student_parents")
    .select("student_id, relationship, students(id, nis, class_id, profiles(full_name), classes(name))")
    .eq("parent_id", idOrangTua);

  if (!daftarTautan || daftarTautan.length === 0) return [];

  const daftarAnak = daftarTautan.map((link: Record<string, unknown>) => {
    const s = link.students as unknown as Record<string, unknown>;
    return {
      student_id: s.id as string,
      student_name: ((s.profiles as any)?.full_name as string) || "—",
      nis: s.nis as string,
      class_id: s.class_id as string,
      class_name: ((s.classes as any)?.name as string) || "—",
      relationship: link.relationship as string,
    };
  });

  const daftarIdAnak = daftarAnak.map((a) => a.student_id);
  const daftarIdKelas = [...new Set(daftarAnak.map((a) => a.class_id).filter(Boolean))];

  // 2. Batch Query Bersama (Menghilangkan N+1 Database Call)
  const [hasilAbsensiBatch, hasilSesiBatch] = await Promise.all([
    adminClient
      .from("attendance_records")
      .select("student_id, status, hand_raise_count, seat_code")
      .in("student_id", daftarIdAnak),
    adminClient
      .from("attendance_sessions")
      .select("id, class_id")
      .in("class_id", daftarIdKelas),
  ]);

  const semuaCatatan = hasilAbsensiBatch.data || [];
  const semuaSesiKelas = hasilSesiBatch.data || [];

  // Ambil data telemetri tidur untuk seluruh sesi kelas terkait
  const idSesiKelas = semuaSesiKelas.map((s: Record<string, unknown>) => s.id as string);
  let dataTidurBatch: Record<string, unknown>[] = [];
  if (idSesiKelas.length > 0) {
    const { data } = await adminClient
      .from("classroom_telemetry")
      .select("session_id, sleep_detected_count")
      .in("session_id", idSesiKelas)
      .gt("sleep_detected_count", 0);
    dataTidurBatch = data || [];
  }

  // Hash Map Pengelompokan Absensi & Telemetri Per Anak
  const petaAbsensiAnak = new Map<string, { total: number; hadir: number; alpa: number; angkatTangan: number; meja: string }>();
  for (const baris of semuaCatatan) {
    const idS = baris.student_id as string;
    const ada = petaAbsensiAnak.get(idS) || { total: 0, hadir: 0, alpa: 0, angkatTangan: 0, meja: "" };
    ada.total += 1;
    if (baris.status === "present" || baris.status === "late") {
      ada.hadir += 1;
    } else if (baris.status === "absent") {
      ada.alpa += 1;
    }
    ada.angkatTangan += (baris.hand_raise_count as number) || 0;
    if (baris.seat_code && !ada.meja) {
      ada.meja = baris.seat_code as string;
    }
    petaAbsensiAnak.set(idS, ada);
  }

  // Hash Map Sesi ID -> ID Kelas
  const petaSesiKeKelas = new Map<string, string>();
  for (const s of semuaSesiKelas) {
    petaSesiKeKelas.set(s.id as string, s.class_id as string);
  }

  // Hash Map Akumulasi Tidur Per Kelas
  const petaTidurKelas = new Map<string, number>();
  for (const t of dataTidurBatch) {
    const idSesi = t.session_id as string;
    const idK = petaSesiKeKelas.get(idSesi);
    if (idK) {
      petaTidurKelas.set(idK, (petaTidurKelas.get(idK) || 0) + ((t.sleep_detected_count as number) || 0));
    }
  }

  // 3. Gabungkan Data dengan Kompleksitas O(1) per Anak
  return daftarAnak.map((anak) => {
    const statAbsensi = petaAbsensiAnak.get(anak.student_id) || { total: 0, hadir: 0, alpa: 0, angkatTangan: 0, meja: "" };
    const persentaseHadir = statAbsensi.total > 0 ? Math.round((statAbsensi.hadir / statAbsensi.total) * 100) : 0;
    const insidenTidur = petaTidurKelas.get(anak.class_id) || 0;

    const frekuensiTidur = Math.min(insidenTidur / Math.max(statAbsensi.total, 1), 1.0);
    const skorRisiko = 0.60 * (1.0 - persentaseHadir / 100) + 0.40 * frekuensiTidur;

    return {
      ...anak,
      attendance_rate: persentaseHadir,
      total_sessions: statAbsensi.total,
      present_count: statAbsensi.hadir,
      absent_count: statAbsensi.alpa,
      sleep_incidents: insidenTidur,
      hand_raise_count: statAbsensi.angkatTangan,
      favorite_seat: statAbsensi.meja || "Meja Siswa",
      risk_score: Math.round(skorRisiko * 100) / 100,
      risk_level: hitungTingkatRisiko(skorRisiko),
    };
  });
}

// Alias kompatibilitas
export const getChildEngagement = ambilKeterlibatanAnak;
