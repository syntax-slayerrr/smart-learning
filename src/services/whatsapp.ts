// ============================================
// WhatsApp Gateway Service — SYNTAX SLAYER
// Production-ready with provider abstraction,
// retry-safe design, and delivery tracking.
// ============================================

// --- Interfaces ---

export interface SendMessageParams {
  phone: string;
  message: string;
}

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  providerResponse?: string;
  error?: string;
  statusCode?: number;
}

interface WhatsAppProvider {
  name: string;
  send(params: SendMessageParams, token: string): Promise<DeliveryResult>;
  sendBatch?(targets: SendMessageParams[], token: string): Promise<DeliveryResult>;
}

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

  // Fallback to sequential if batch not supported by provider
  let successCount = 0;
  for (const t of targets) {
    const res = await sendWhatsAppMessage(t, config);
    if (res.success) successCount++;
  }
  
  return { success: successCount > 0 };
}

// --- Helpers ---

function normalizePhoneNumber(phone: string): string {
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, "");
  // Convert 08xxx to 628xxx
  if (digits.startsWith("0")) {
    digits = "62" + digits.substring(1);
  }
  // Ensure it starts with country code
  if (!digits.startsWith("62")) {
    digits = "62" + digits;
  }
  return digits;
}

function logDelivery(
  provider: string,
  phone: string,
  result: DeliveryResult
): void {
  const maskedPhone = phone.substring(0, 4) + "****" + phone.substring(phone.length - 3);
  if (result.success) {
    console.log(`[WhatsApp:${provider}] ✅ Sent to ${maskedPhone}${result.messageId ? ` (ID: ${result.messageId})` : ""}`);
  } else {
    console.error(`[WhatsApp:${provider}] ❌ Failed to ${maskedPhone}: ${result.error}`);
  }
}

// --- Message Templates ---

export function buildAttendanceMessage(params: {
  studentName: string;
  className: string;
  subject: string;
  status: string;
  time: string;
}): string {
  const statusLabels: Record<string, string> = {
    present: "✅ Hadir",
    late: "⚠️ Terlambat",
    sick: "🏥 Sakit",
    excused: "📝 Izin",
    absent: "❌ Tidak Hadir",
  };

  const greetings = ["Halo", "Hai", "Salam", "Selamat Pagi/Siang"];
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  return [
    `*${randomGreeting} Bapak/Ibu*,`,
    "",
    "📋 *Notifikasi Absensi Sekolah*",
    `Siswa: *${params.studentName}*`,
    `Kelas: ${params.className}`,
    `Mata Pelajaran: ${params.subject}`,
    `Status: ${statusLabels[params.status] || params.status}`,
    `Waktu: ${params.time}`,
    "",
    "— _SYNTAX SLAYER - AI Smart Learning Ecosystem_",
    `_[Ref: ${refCode}]_`
  ].join("\n");
}

export function buildDailyRecapMessage(params: {
  studentName: string;
  date: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
}): string {
  const greetings = ["Halo", "Hai", "Salam", "Selamat Malam"];
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  return [
    `*${randomGreeting} Bapak/Ibu*,`,
    "",
    "📊 *Rekap Harian Absensi*",
    `Siswa: *${params.studentName}*`,
    `Tanggal: ${params.date}`,
    "",
    `Total Sesi: ${params.totalSessions}`,
    `✅ Hadir: ${params.presentCount}`,
    `⚠️ Terlambat: ${params.lateCount}`,
    `❌ Tidak Hadir: ${params.absentCount}`,
    "",
    "— _SYNTAX SLAYER - AI Smart Learning Ecosystem_",
    `_[Ref: ${refCode}]_`
  ].join("\n");
}
