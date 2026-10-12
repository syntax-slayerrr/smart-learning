import { NextRequest, NextResponse } from "next/server";
import { call9Router, ROUTER_MODELS } from "@/lib/ai/9router";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subject = "Pembelajaran Umum",
      teacher = "Guru Pengajar",
      detectedCount = 0,
      sittingCount = 0,
      standingCount = 0,
      sleepCount = 0,
      handRaiseCount = 0,
      focusIndex = 100,
      phaseMinutes = 30,
    } = body;

    const systemPrompt = `Anda adalah Smart AI Pedagogical Assistant di platform Smart Learning (SYNTAX SLAYER).
Tugas Anda adalah memantau telemetri kelas secara real-time dan memberikan 1 intervensi pedagogis taktis yang singkat, ramah, dan aplikatif bagi guru.

Panduan respons:
1. Maksimal 2-3 kalimat.
2. Berikan observasi singkat dan 1 saran aksi nyata (misal: ice-breaking 2 menit, kuis cepat 1 pertanyaan, tanya-jawab berpasangan, atau keliling kelas).
3. Gunakan bahasa Indonesia formal-profesional namun hangat.
4. Format output: teks langsung tanpa pengantar bertele-tele.`;

    const userPrompt = `Data Telemetri Kelas Saat Ini:
- Mata Pelajaran: ${subject} (${teacher})
- Durasi Sesi Berjalan: ${phaseMinutes} menit
- Subjek Terdeteksi: ${detectedCount}
- Posisi Duduk: ${sittingCount}, Berdiri: ${standingCount}
- Angkat Tangan Bertanya: ${handRaiseCount}
- Terdeteksi Menunduk / Tidur: ${sleepCount}
- Indeks Fokus Kelas: ${focusIndex}%

Berikan rekomendasi taktis pedagogis yang paling tepat untuk situasi di atas.`;

    const aiResponse = await call9Router({
      model: ROUTER_MODELS.GEMINI_3_FLASH,
      temperature: 0.6,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (aiResponse.success && aiResponse.content) {
      return NextResponse.json({
        success: true,
        source: "ai-gateway",
        model: aiResponse.model,
        nudge: aiResponse.content.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    // Heuristic fallback
    let fallbackNudge = "";
    if (sleepCount > 0) {
      fallbackNudge = `Terdeteksi ${sleepCount} subjek menunduk di meja. Disarankan guru berkeliling ke area tersebut atau menyisipkan pertanyaan pemantik interaktif untuk mengembalikan energi belajar.`;
    } else if (focusIndex < 75) {
      fallbackNudge = `Indeks konsentrasi kelas berada di angka ${focusIndex}%. Pertimbangkan untuk beralih ke sesi diskusi berpasangan (Think-Pair-Share) selama 3 menit untuk mengaktifkan kembali atensi siswa.`;
    } else if (handRaiseCount > 2) {
      fallbackNudge = `Antusiasme siswa tinggi dengan ${handRaiseCount} interaksi angkat tangan. Manfaatkan momentum ini untuk memberikan apresiasi poin keaktifan bagi siswa yang berpartisipasi.`;
    } else {
      fallbackNudge = `Dinamika kelas kondusif dengan fokus ${focusIndex}%. Pertahankan ritme pembelajaran dengan memberikan penguatan konsep kunci sebelum memasuki materi berikutnya.`;
    }

    return NextResponse.json({
      success: true,
      source: "heuristic-engine",
      nudge: fallbackNudge,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Saran Belajar Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate nudge" },
      { status: 500 }
    );
  }
}
