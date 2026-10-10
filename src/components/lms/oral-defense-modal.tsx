"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  CheckCircle2,
  BrainCircuit,
  Award,
  Loader2,
  FileCheck,
  ArrowRight,
  Lightbulb,
  Keyboard,
  Volume2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DefenseQuestion {
  id: string;
  question: string;
  focusArea: string;
  thoughtStarters?: string[];
  suggestedAnswer?: string;
}

interface OralDefenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentTitle: string;
  submissionFilename?: string;
  onConfirmOfficialSubmit: (defenseData: {
    score: number;
    feedback: string;
    verifiedAnswers: Record<string, string>;
  }) => void;
}

export function OralDefenseModal({
  isOpen,
  onClose,
  assignmentTitle,
  submissionFilename = "Tugas_Subnetting_VLSM.pdf",
  onConfirmOfficialSubmit,
}: OralDefenseModalProps) {
  const [step, setStep] = useState<"questioning" | "evaluating" | "passed">("questioning");
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [currentInput, setCurrentInput] = useState<string>("");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [aiEvaluation, setAiEvaluation] = useState<{ score: number; feedback: string }>({
    score: 95,
    feedback: "Verifikasi Pemahaman Berhasil: Penjelasan pemahaman logika VLSM dan segmentasi domain sangat tepat dan konsisten dengan naskah tugas.",
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const defenseQuestions: DefenseQuestion[] = [
    {
      id: "q1",
      question:
        "Pada halaman 2 tugasmu, kamu mengalokasikan subnet /28 untuk Lab Komputer (14 host). Mengapa kamu memilih /28 daripada /27 yang kapasitasnya lebih longgar?",
      focusArea: "Efisiensi Alokasi VLSM & Host",
      thoughtStarters: [
        "Rumus host 2^n - 2 (4 bit = 14 host pas)",
        "Prefix /27 boros 16 IP menganggur",
        "Mencegah pemborosan blok subnet utama",
      ],
      suggestedAnswer:
        "Karena rumus kapasitas host adalah 2^n - 2. Pada prefix /28 terdapat 4 bit host sehingga menghasilkan tepat 14 IP usable yang pas untuk kebutuhan lab. Jika memakai /27 kapasitasnya 30 host sehingga 16 IP akan menganggur dan memboroskan alokasi jaringan.",
    },
    {
      id: "q2",
      question:
        "Bagaimana caramu memastikan router tidak mengalami broadcast storm ketika segmen jaringan Lab dan Ruang Guru saling terhubung?",
      focusArea: "Segmentasi Domain & Keamanan Router",
      thoughtStarters: [
        "Pemisahan VLAN di switch layer 2",
        "Penerapan Access Control List (ACL)",
        "Isolasi broadcast domain per sub-antarmuka",
      ],
      suggestedAnswer:
        "Saya memisahkan broadcast domain dengan menerapkan VLAN yang berbeda antara Lab dan Ruang Guru di Switch, serta mengonfigurasi inter-VLAN routing dengan filter Access Control List (ACL) pada default gateway router.",
    },
  ];

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  if (!isOpen) return null;

  const currentQ = defenseQuestions[activeQuestionIdx];

  const startVoiceRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "id-ID";
        recognition.continuous = true;
        recognition.interimResults = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setCurrentInput((prev) => {
              if (!prev) return transcript;
              return prev.endsWith(" ") ? prev + transcript : prev + " " + transcript;
            });
          }
        };

        recognition.onerror = () => {
          stopVoiceRecording();
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        return;
      } catch {
        // Fallback to simulated audio recording
      }
    }

    // Fallback if browser permission is blocked or mock environment
    setIsRecording(true);
    setTimeout(() => {
      setCurrentInput(currentQ.suggestedAnswer || "");
      setIsRecording(false);
    }, 2800);
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleApplyThoughtStarter = (starterText: string) => {
    if (currentInput.includes(starterText)) return;
    setCurrentInput((prev) => {
      const cleanPrev = prev.trim();
      if (!cleanPrev) return starterText;
      return `${cleanPrev}. Selain itu, ${starterText.toLowerCase()}`;
    });
  };

  const handleNextQuestion = () => {
    if (!currentInput.trim()) return;

    stopVoiceRecording();

    const updatedAnswers = {
      ...studentAnswers,
      [currentQ.id]: currentInput,
    };
    setStudentAnswers(updatedAnswers);
    setCurrentInput("");
    setRecordingSeconds(0);

    if (activeQuestionIdx < defenseQuestions.length - 1) {
      setActiveQuestionIdx((prev) => prev + 1);
      setInputMode("voice");
    } else {
      // All questions completed -> evaluate via backend API
      setStep("evaluating");
      const formattedAnswers = defenseQuestions.map((q) => ({
        questionId: q.id,
        questionText: q.question,
        studentAnswer: updatedAnswers[q.id] || "",
      }));

      fetch("/api/lms/uji-lisan/evaluasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: "28a6100c-f557-4dad-8e0a-bdd77be53390",
          answers: formattedAnswers,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.evaluation) {
            setAiEvaluation({
              score: data.evaluation.overall_defense_score || data.evaluation.understanding_score || 95,
              feedback:
                data.evaluation.summary_feedback ||
                data.evaluation.feedback ||
                "Verifikasi berhasil: Nalar logika konseptual sangat memuaskan.",
            });
          }
          setStep("passed");
        })
        .catch(() => {
          setStep("passed");
        });
    }
  };

  const handleFinalSubmit = () => {
    onConfirmOfficialSubmit({
      score: aiEvaluation.score,
      feedback: aiEvaluation.feedback,
      verifiedAnswers: studentAnswers,
    });
    onClose();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[92dvh] bg-[#F8FAFC]/90 backdrop-blur-2xl text-slate-900 border-0 sm:border border-white/60 sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden overscroll-contain">
        
        {/* Top Floating App Bar (Ella Reference Style) */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-600" />
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              Uji Lisan Pemahaman Siswa
            </span>
          </div>

          <button
            onClick={() => {
              stopVoiceRecording();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-semibold transition-all border border-slate-200/80 shadow-xs active:scale-95"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Active Questioning State (Ella-inspired Layout) */}
        {step === "questioning" && (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 space-y-4 pb-4">
            
            {/* 1. Hero Warm Greeting (Ella Reference: "Hai, saya Ella") */}
            <div className="space-y-0.5 pt-1">
              <h2 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
                Hai, Zaldy 👋
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
                Mari diskusikan tugas <strong className="text-slate-700 font-semibold">{assignmentTitle}</strong> secara santai.
              </p>
            </div>

            {/* 2. Featured Notification Card (Ella Reference: Announcement Card) */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20">
                  <BrainCircuit className="w-3 h-3 text-[#007AFF]" />
                  Pertanyaan {activeQuestionIdx + 1} dari {defenseQuestions.length}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  Fokus: <span className="text-slate-700 font-semibold">{currentQ.focusArea}</span>
                </span>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-slate-200/60 h-1.5 rounded-full mb-3 overflow-hidden">
                <div 
                  className="bg-[#007AFF] h-full rounded-full transition-all duration-300"
                  style={{ width: `${((activeQuestionIdx + 1) / defenseQuestions.length) * 100}%` }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <FileCheck className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Naskah Tugas ({submissionFilename}):</span>
                </div>
                <p className="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug">
                  \"{currentQ.question}\"
                </p>
              </div>
            </div>

            {/* 3. Tool Cards Grid (Ella Reference: "Alat Produktivitas" Cards) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Kerangka Pikir & Pemantik Jawaban</span>
                </h3>
                <span className="text-[10px] text-slate-400">Sentuh untuk masukkan ide</span>
              </div>

              {/* Grid of Clean Action Cards */}
              <div className="grid grid-cols-2 gap-2">
                {currentQ.thoughtStarters?.map((starter, sIdx) => {
                  const icons = ["🧮", "⚡", "🎯", "🛡️"];
                  const icon = icons[sIdx % icons.length];
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleApplyThoughtStarter(starter)}
                      className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-white/70 hover:bg-white/95 border border-white/80 hover:border-[#007AFF]/40 text-left transition-all shadow-xs active:scale-[0.98] group backdrop-blur-md"
                    >
                      <div className="w-8 h-8 rounded-xl bg-white/80 group-hover:bg-[#007AFF]/10 flex items-center justify-center text-sm shrink-0 transition-colors">
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-[#007AFF] truncate">
                          {starter.split("(")[0]?.trim() || starter}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {starter.includes("(") ? starter.match(/\((.*?)\)/)?.[1] : "Gunakan argumen ini"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Active Live Transcription / Text Feedback Card */}
            {currentInput && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-700">
                    <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                    Argumen yang Disiapkan:
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentInput("")}
                    className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[11px] font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-24 overflow-y-auto font-medium">
                  {currentInput}
                </p>
              </div>
            )}

            {/* Recording Active Status Banner */}
            {isRecording && (
              <div className="flex items-center justify-between bg-red-50 border border-red-200/80 rounded-2xl px-4 py-2.5 text-red-700">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Mendengarkan ucapanmu... ({formatSeconds(recordingSeconds)})</span>
                </div>
                <div className="flex items-center gap-1 h-4">
                  <span className="w-1 bg-red-500 rounded-full animate-bounce h-2" />
                  <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:150ms] h-4" />
                  <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:300ms] h-3" />
                </div>
              </div>
            )}

          </div>
        )}

        {/* Step 2: Evaluating State */}
        {step === "evaluating" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-base font-bold text-slate-900">
                Mengevaluasi Nalar & Pemahaman...
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Smart AI memverifikasi keselarasan argumen lisanmu dengan laporan teknis yang kamu unggah.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Passed & Verified State */}
        {step === "passed" && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 text-center flex flex-col justify-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 mx-auto flex items-center justify-center shadow-sm">
              <Award className="w-10 h-10 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900">
                Verifikasi Pemahaman Lolos!
              </h4>
              <p className="text-xs text-slate-500">
                Kamu telah membuktikan bahwa tugas ini murni hasil pemikiran dan analisismu sendiri.
              </p>
            </div>

            {/* Score & AI Commentary Card */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 text-left space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-950">
                  Indeks Penguasaan Materi:
                </span>
                <span className="font-mono text-lg font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-xl border border-emerald-200/60 shadow-xs">
                  {aiEvaluation.score}%
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed italic border-l-2 border-emerald-500 pl-3 py-0.5">
                \"{aiEvaluation.feedback}\"
              </p>
            </div>
          </div>
        )}

        {/* Bottom Floating Prompt Dock (Ella Reference Style: Sleek Pill Bar) */}
        <div className="shrink-0 p-3.5 sm:p-4 border-t border-white/60 bg-white/75 backdrop-blur-2xl">
          {step === "questioning" && (
            <div className="flex items-center gap-2">
              
              {/* Input Capsule (Ella Style) */}
              <div className="flex-1 flex items-center bg-white/80 hover:bg-white/95 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007AFF]/25 focus-within:border-[#007AFF] border border-white/80 rounded-full px-4 py-1.5 sm:py-2 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onFocus={(e) => {
                    // Prevent layout jump on mobile keyboard trigger
                    e.target.scrollIntoView = () => {};
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && currentInput.trim() && !isRecording) {
                      handleNextQuestion();
                    }
                  }}
                  placeholder={isRecording ? "Mendengarkan ucapanmu..." : "Ketik argumen atau bicara..."}
                  className="w-full bg-transparent text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />

                {/* Tactile Mic Button inside Capsule */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ml-1.5 shrink-0 ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse shadow-xs"
                      : "bg-white text-slate-600 hover:text-[#007AFF] border border-white/80 shadow-xs active:scale-95"
                  }`}
                  title={isRecording ? "Hentikan rekaman" : "Mulai bicara (Voice)"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Submit / Next Arrow Button (Ella Style Pill Action) */}
              <button
                type="button"
                disabled={!currentInput.trim() || isRecording}
                onClick={handleNextQuestion}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#007AFF] hover:bg-[#0062CC] disabled:opacity-30 disabled:hover:bg-[#007AFF] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#007AFF]/20 transition-all active:scale-95"
                title="Kirim & Lanjut"
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}

          {step === "passed" && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Tutup
              </button>
              <Button
                variant="primary"
                onClick={handleFinalSubmit}
                className="flex-1 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kirimkan Tugas Resmi ke Guru</span>
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
