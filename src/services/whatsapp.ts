// ============================================
// WhatsApp Gateway Service — SYNTAX SLAYER
// Arsitektur Level Enterprise untuk Pengiriman Notifikasi & Rekap
// Tim Developer 2: Backend, Database & Telemetry Gateway
// ============================================

// --- Definisi Tipe & Kontrak Data (Bahasa Indonesia & Kompatibilitas) ---

export interface ParameterKirimPesan {
  nomorTelepon: string;
  isiPesan: string;
}

// Backward-compatibility alias
export type SendMessageParams = {
  phone: string;
  message: string;
};

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  providerResponse?: string;
  error?: string;
  statusCode?: number;
  // Indonesian optional presentation aliases
  berhasil?: boolean;
  idPesan?: string;
  responsPenyedia?: string;
  pesanKesalahan?: string;
  kodeStatus?: number;
}

// Indonesian presentation alias
export type HasilPengirimanPesan = DeliveryResult;

interface PenyediaWhatsApp {
  nama: string;
  kirim(params: ParameterKirimPesan, token: string): Promise<HasilPengirimanPesan>;
  kirimBatch?(targetList: ParameterKirimPesan[], token: string): Promise<HasilPengirimanPesan>;
}

// Backward-compatibility alias
type WhatsAppProvider = {
  name: string;
  send(params: SendMessageParams, token: string): Promise<DeliveryResult>;
  sendBatch?(targets: SendMessageParams[], token: string): Promise<DeliveryResult>;
};

// --- Provider: Fonnte ---

const FonnteProvider: WhatsAppProvider = {
  name: "Fonnte",
  async send(params, token) {
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: params.phone,
          message: params.message,
          countryCode: "62",
          delay: "3-6", // Simulasikan status "Mengetik..." (Typing indicator) selama 3-6 detik!
        }),
      });

      const statusCode = response.status;
      const responseText = await response.text();

      let body: any = {};
      try {
        body = JSON.parse(responseText);
      } catch {
        body = { raw: responseText };
      }

      if (!response.ok) {
        return {
          success: false,
          error: body.reason || `Fonnte error (${statusCode}): ${responseText.substring(0, 50)}`,
          statusCode,
        };
      }

      // Fonnte returns { status: true/false }
      if (body.status === false) {
        return {
          success: false,
          error: body.reason || "Fonnte rejected the message",
          statusCode,
        };
      }

      return {
        success: true,
        messageId: body.id || "sent",
        providerResponse: responseText,
        statusCode,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  },
  async sendBatch(targets, token) {
    try {
      const dataPayload = targets.map(t => ({
        target: t.phone,
        message: t.message,
        delay: "2-4",
        countryCode: "62"
      }));

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: dataPayload
        }),
      });

      const statusCode = response.status;
      const responseText = await response.text();

      let body: any = {};
      try {
        body = JSON.parse(responseText);
      } catch {
        body = { raw: responseText };
      }

      if (!response.ok || body.status === false) {
        return {
          success: false,
          error: body.reason || `Fonnte batch error (${statusCode})`,
          statusCode,
        };
      }

      return {
        success: true,
        messageId: "batch_sent",
        providerResponse: responseText,
        statusCode,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  },
};

// --- Provider: Wablas ---

const WablasProvider: WhatsAppProvider = {
  name: "Wablas",
  async send(params, token) {
    try {
      // Wablas requires specific node domain. We expect format: domain.wablas.com|actual_token
      let domain = "solo.wablas.com"; // Default popular node
      let actualToken = token;
      let secretKey = "";
      
      if (token.includes("|")) {
        const parts = token.split("|");
        domain = parts[0]?.trim() || domain;
        actualToken = parts[1]?.trim() || token;
        secretKey = parts[2]?.trim() || "";
      }
      
      if (!domain.startsWith("http")) {
        domain = `https://${domain}`;
      }

      // Pastikan format URL sesuai dengan API Wablas
      // Beberapa node mungkin menggunakan /api/v2/send-message, tapi defaultnya /api/send-message
      let url = `${domain.replace(/\/$/, '')}/api/send-message`;

      const formData = new URLSearchParams();
      formData.append("phone", params.phone);
      formData.append("message", params.message);
      
      // Beberapa versi wablas butuh token & secret di dalam form data
      if (actualToken) formData.append("token", actualToken);
      if (secretKey) formData.append("secret_key", secretKey);
      if (secretKey) formData.append("secret", secretKey); // Alias

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": actualToken, // Wajib di header juga
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: formData.toString(),
      });

      const statusCode = response.status;
      const responseText = await response.text().catch(() => "");
      
      let body: any = {};
      try {
        body = JSON.parse(responseText);
      } catch {
        body = { raw: responseText };
      }

      if (!response.ok) {
        return {
          success: false,
          error: body.message || `Wablas error (${statusCode})`,
          statusCode,
        };
      }

      return {
        success: true,
        messageId: body.data?.messages?.[0]?.id || "sent",
        providerResponse: responseText,
        statusCode,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
};

// --- Provider: Twilio ---

const TwilioProvider: WhatsAppProvider = {
  name: "Twilio",
  async send(params, token) {
    try {
      // Expect token format: AccountSid|AuthToken|FromNumber
      let accountSid = "";
      let authToken = "";
      let fromNumber = "";
      
      if (token.includes("|")) {
        const parts = token.split("|");
        accountSid = parts[0]?.trim();
        authToken = parts[1]?.trim();
        fromNumber = parts[2]?.trim();
      } else {
        return { success: false, error: "Format token Twilio salah. Harap isi AccountSID, AuthToken, dan Nomor Pengirim di pengaturan." };
      }

      // Pastikan format To diawali dengan whatsapp:+ (Twilio requirement)
      let toPhone = params.phone.replace(/[^0-9]/g, ""); // hilangkan karakter non-angka
      if (toPhone.startsWith("0")) toPhone = "62" + toPhone.substring(1);
      
      const toParam = `whatsapp:+${toPhone}`;
      const fromParam = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const formData = new URLSearchParams();
      formData.append("To", toParam);
      formData.append("From", fromParam);
      formData.append("Body", params.message);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString(),
      });

      const statusCode = response.status;
      const responseText = await response.text().catch(() => "");
      
      let body: any = {};
      try {
        body = JSON.parse(responseText);
      } catch {
        body = { raw: responseText };
      }

      if (!response.ok) {
        return {
          success: false,
          error: body.message || `Twilio error (${statusCode})`,
          statusCode,
        };
      }

      return {
        success: true,
        messageId: body.sid || "sent",
        providerResponse: responseText,
        statusCode,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
};

// --- Provider: Generic REST API ---

const GenericProvider: WhatsAppProvider = {
  name: "Generic",
  async send(params, token) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    if (!apiUrl) {
      return { success: false, error: "WHATSAPP_API_URL not configured" };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: params.phone,
        message: params.message,
      }),
    });

    const statusCode = response.status;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown response");
      return {
        success: false,
        error: `API error ${statusCode}: ${errorText}`,
        statusCode,
      };
    }

    return { success: true, statusCode };
  },
};

// --- Provider Selection ---

function getProvider(providerName?: string): WhatsAppProvider {
  if (providerName?.toLowerCase() === "fonnte") {
    return FonnteProvider;
  }
  if (providerName?.toLowerCase() === "wablas") {
    return WablasProvider;
  }
  if (providerName?.toLowerCase() === "twilio") {
    return TwilioProvider;
  }
  
  // Default logic or based on URL
  const apiUrl = process.env.WHATSAPP_API_URL || "";
  if (apiUrl.includes("fonnte.com") || providerName?.toLowerCase() === "fonnte") {
    return FonnteProvider;
  }
  if (apiUrl.includes("wablas.com") || providerName?.toLowerCase() === "wablas") {
    return WablasProvider;
  }
  if (providerName?.toLowerCase() === "twilio") {
    return TwilioProvider;
  }
  return GenericProvider;
}

// --- Public API ---

export async function sendWhatsAppMessage(
  params: SendMessageParams,
  config?: { token?: string; provider?: string }
): Promise<DeliveryResult> {
  const apiToken = config?.token || process.env.WHATSAPP_API_TOKEN;

  if (!apiToken) {
    console.warn("[WhatsApp] API token not configured. Skipping message.");
    return { success: false, error: "WhatsApp API not configured" };
  }

  // Normalize phone number — ensure it starts with country code
  const normalizedPhone = normalizePhoneNumber(params.phone);

  const provider = getProvider(config?.provider);

  try {
    const result = await provider.send(
      { phone: normalizedPhone, message: params.message },
      apiToken
    );

    // Log delivery attempt
    logDelivery(provider.name, normalizedPhone, result);

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const result: DeliveryResult = { success: false, error: errorMessage };
    logDelivery(provider.name, normalizedPhone, result);
    return result;
  }
}

export async function sendWhatsAppBatch(
  targets: SendMessageParams[],
  config?: { token?: string; provider?: string }
): Promise<DeliveryResult> {
  const apiToken = config?.token || process.env.WHATSAPP_API_TOKEN;

  if (!apiToken) {
    console.warn("[WhatsApp] API token not configured. Skipping batch.");
    return { success: false, error: "WhatsApp API not configured" };
  }

  if (targets.length === 0) return { success: true };

  const provider = getProvider(config?.provider);
  
  if (provider.sendBatch) {
    const normalizedTargets = targets.map(t => ({
      ...t,
      phone: normalizePhoneNumber(t.phone)
    }));
    return provider.sendBatch(normalizedTargets, apiToken);
  }

  // DSA: Bounded Chunk Partitioning O(N)
  // Untuk mencegah rate-limit provider dan blocking I/O jaringan,
  // antrean target dipartisi menjadi sub-array berukuran tetap (chunkSize = 10)
  const UKURAN_PARTISI = 10;
  const partisiTarget = partisiArray(targets, UKURAN_PARTISI);
  let totalTerkirim = 0;

  for (const partisi of partisiTarget) {
    // Eksekusi paralel terkendali dalam batas chunk
    const hasilChunk = await Promise.allSettled(
      partisi.map((t) => sendWhatsAppMessage(t, config))
    );

    for (const res of hasilChunk) {
      if (res.status === "fulfilled" && (res.value.success || res.value.berhasil)) {
        totalTerkirim++;
      }
    }

    // Jeda mikro 150ms antar-chunk untuk stabilitas gateway
    if (partisiTarget.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return {
    success: totalTerkirim > 0,
    berhasil: totalTerkirim > 0,
    messageId: `batch_${totalTerkirim}_dari_${targets.length}`,
    idPesan: `batch_${totalTerkirim}_dari_${targets.length}`,
  };
}

// --- Algoritma Partisi Array (DSA: O(N) Linear Partition) ---

function partisiArray<T>(items: T[], ukuran: number): T[][] {
  const hasil: T[][] = [];
  for (let i = 0; i < items.length; i += ukuran) {
    hasil.push(items.slice(i, i + ukuran));
  }
  return hasil;
}

// --- Helpers & Normalisasi Nomor ---

export function normalisasiNomorPonsel(phone: string): string {
  // Menghapus semua karakter non-numerik O(L)
  let digits = phone.replace(/\D/g, "");
  // Konversi format lokal 08xxx menjadi standar internasional 628xxx
  if (digits.startsWith("0")) {
    digits = "62" + digits.substring(1);
  }
  // Pastikan memiliki prefix kode negara Indonesia (62)
  if (!digits.startsWith("62")) {
    digits = "62" + digits;
  }
  return digits;
}

// Backward-compatibility alias
export const normalizePhoneNumber = normalisasiNomorPonsel;

function logDelivery(
  provider: string,
  phone: string,
  result: DeliveryResult
): void {
  const maskedPhone = phone.substring(0, 4) + "****" + phone.substring(phone.length - 3);
  const isSuccess = Boolean(result.success || result.berhasil);
  const msgId = result.messageId || result.idPesan;
  const errMsg = result.error || result.pesanKesalahan;
  if (isSuccess) {
    console.log(`[WhatsApp:${provider}] ✅ Terkirim ke ${maskedPhone}${msgId ? ` (ID: ${msgId})` : ""}`);
  } else {
    console.error(`[WhatsApp:${provider}] ❌ Gagal ke ${maskedPhone}: ${errMsg}`);
  }
}

// --- Generator Format Pesan (Template Presentasi) ---

export function buatPesanAbsensi(params: {
  studentName: string;
  className: string;
  subject: string;
  status: string;
  time: string;
}): string {
  const statusLabels: Record<string, string> = {
    present: "✅ Hadir Tepat Waktu",
    late: "⚠️ Terlambat Masuk",
    sick: "🏥 Sakit (Surat Terverifikasi)",
    excused: "📝 Izin Resmi",
    absent: "❌ Tidak Hadir (Alpha)",
  };

  const salam = ["Halo", "Salam Hormat", "Selamat Pagi/Siang"];
  const salamTerpilih = salam[Math.floor(Math.random() * salam.length)];
  const kodeReferensi = Math.random().toString(36).substring(2, 8).toUpperCase();

  return [
    `*${salamTerpilih} Bapak/Ibu Wali Murid*,`,
    "",
    "📋 *NOTIFIKASI KEHADIRAN SISWA REAL-TIME*",
    `• Nama Siswa : *${params.studentName}*`,
    `• Kelas      : ${params.className}`,
    `• Pelajaran  : ${params.subject}`,
    `• Status     : ${statusLabels[params.status] || params.status}`,
    `• Waktu      : ${params.time} WIB`,
    "",
    "Sistem AI Smart Learning mencatat kehadiran ini secara otomatis melalui pemindaian presisi tinggi.",
    "",
    "— _SYNTAX SLAYER AI Smart Learning Ecosystem_",
    `_[ID Ref: ${kodeReferensi}]_`
  ].join("\n");
}

// Backward-compatibility alias
export const buildAttendanceMessage = buatPesanAbsensi;

export function buatPesanRekapHarian(params: {
  studentName: string;
  date: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
}): string {
  const salam = ["Halo", "Salam Hormat", "Selamat Sore/Malam"];
  const salamTerpilih = salam[Math.floor(Math.random() * salam.length)];
  const kodeReferensi = Math.random().toString(36).substring(2, 8).toUpperCase();

  return [
    `*${salamTerpilih} Bapak/Ibu Wali Murid*,`,
    "",
    "📊 *REKAPITULASI KEHADIRAN HARIAN SISWA*",
    `• Nama Siswa : *${params.studentName}*`,
    `• Tanggal    : ${params.date}`,
    "",
    `• Total Sesi Pembelajaran : ${params.totalSessions}`,
    `• Kehadiran               : ${params.presentCount} Sesi`,
    `• Terlambat               : ${params.lateCount} Sesi`,
    `• Ketidakhadiran          : ${params.absentCount} Sesi`,
    "",
    "Laporan ini diakumulasi secara komputasional oleh sistem analitik AI sekolah.",
    "",
    "— _SYNTAX SLAYER AI Smart Learning Ecosystem_",
    `_[ID Ref: ${kodeReferensi}]_`
  ].join("\n");
}

// Backward-compatibility alias
export const buildDailyRecapMessage = buatPesanRekapHarian;

// --- Presentasi Aliases Utama ---
export const kirimPesanWhatsApp = sendWhatsAppMessage;
export const kirimBatchWhatsApp = sendWhatsAppBatch;

