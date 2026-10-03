# 🎓 Smart Learning Ecosystem

> **Next-Generation AI-Powered Learning & Smart Campus Platform**  
> Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase, and AI Integration.

---

## 🌟 Overview

**Smart Learning** adalah platform ekosistem pembelajaran cerdas dan manajemen kampus modern. Platform ini menggabungkan manajemen kurikulum interaktif (*Modular Learning Hub*), asesmen adaptif (*Adaptive Quiz Engine*), portofolio kejuruan (*Vocational Skill Tree*), dan kehadiran kampus (*Campus Pulse Attendance*) yang terintegrasi langsung dengan asisten AI (*AI Learning Co-Pilot*).

---

## 🏛️ Core Pillars

```
                     ┌──────────────────────────────────┐
                     │     SMART LEARNING PLATFORM      │
                     └─────────────────┬────────────────┘
                                       │
         ┌──────────────────┬──────────┴─────────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
┌──────────────────┐ ┌──────────────┐ ┌───────────────────┐ ┌──────────────┐
│  Modular Learning│ │Adaptive Quiz │ │Vocational Skill   │ │Campus Pulse  │
│  & Course Hub    │ │& Diagnostics │ │Tree & Portfolio   │ │Attendance &  │
│                  │ │              │ │                   │ │Notifications │
└──────────────────┘ └──────────────┘ └───────────────────┘ └──────────────┘
         │                  │                    │                  │
         └──────────────────┴──────────┬─────────┴──────────────────┘
                                       ▼
                     ┌──────────────────────────────────┐
                     │    AI Learning Co-Pilot & Early   │
                     │    Warning Intelligence System   │
                     └──────────────────────────────────┘
```

1. **Modular Course Hub:** Pembelajaran berbasis bab modular, video interaktif, progress tracking materi real-time, dan lab praktikum.
2. **Adaptive Quiz & Diagnostic Engine:** Bank soal cerdas, deteksi kelemahan topik kognitif, pencegahan kecurangan (anti-cheat browser lockdown), dan feedback otomatis.
3. **Vocational Skill Tree & Portfolio:** Pelacakan matriks kompetensi kejuruan, logbook digital Praktik Kerja Lapangan (PKL), dan showcase portofolio siswa yang siap industri.
4. **Campus Pulse & Early Warning:** Presensi real-time (QR code & geofence), notifikasi otomatis ke orang tua (WhatsApp / Web Push), serta sistem intervensi dini yang menghubungkan kehadiran dengan performa akademik.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Realtime)
- **Notifications:** WhatsApp Gateway API & Web Push Notifications
- **Hosting:** [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/syntax-slayerrr/smart-learning.git
cd smart-learning
npm install
```

### 2. Environment Variables
Buat file `.env.local` dan masukkan kredensial Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# WhatsApp Gateway (Opsional)
WHATSAPP_API_URL="https://api.fonnte.com/send"
WHATSAPP_API_TOKEN="your-wa-token"
```

### 3. Run Development Server
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 👥 User Roles

- **Admin:** Manajemen pengguna, mata pelajaran, kurikulum, analytics sekolah, dan konfigurasi sistem.
- **Guru:** Pembuat modul pelajaran, perancang kuis, input nilai, pemantauan kehadiran & performa siswa.
- **Siswa:** Akses materi pembelajaran, pengerjaan kuis, pelacakan skill tree, presensi, dan riwayat belajar.
- **Orang Tua:** Pemantauan progres belajar anak, nilai kuis, rekap absensi, dan notifikasi sekolah real-time.

---

## 📄 License
Private & Proprietary. All rights reserved.
