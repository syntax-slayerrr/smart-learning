# AbsenSMK — Deployment & Setup Guide

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [Supabase Account](https://supabase.com)
- [Vercel Account](https://vercel.com) (optional for deployment)

---

## 1️⃣ Supabase Setup

### Create Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name**: `absen-smk`
   - **Region**: `Southeast Asia (Singapore)`
   - **Database Password**: (save this securely)
4. Wait for project to initialize (~2 minutes)

### Run Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the editor and click **Run**
5. Verify: You should see all tables listed in **Table Editor**

### Get API Keys
1. Go to **Settings → API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon/Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

---

## 2️⃣ Environment Configuration

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your values:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Optional: WhatsApp notifications via Fonnte
WHATSAPP_API_URL="https://api.fonnte.com/send"
WHATSAPP_API_TOKEN="your-fonnte-token"
```

Verify configuration:
```bash
npx tsx scripts/verify-env.ts
```

---

## 3️⃣ Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 4️⃣ Create Test Users

### Option A: Via Supabase Dashboard
1. Go to **Authentication → Users → Add User**
2. Create users with these emails and metadata:

| Email | Password | Role | Full Name |
|---|---|---|---|
| `admin@absensmk.test` | `password123` | admin | Administrator |
| `guru.matematika@absensmk.test` | `password123` | teacher | Budi Santoso |
| `siswa.andi@absensmk.test` | `password123` | student | Andi Pratama |
| `ortu.andi@absensmk.test` | `password123` | parent | Pak Pratama |

When creating each user, add **User Metadata** (JSON):
```json
{
  "full_name": "Administrator",
  "role": "admin"
}
```

### Option B: Via SQL
After creating users via Dashboard, run `supabase/seed.sql` in the SQL Editor.

---

## 5️⃣ Deploy to Vercel

### Option A: CLI Deployment
```bash
npm install -g vercel
vercel --prod
```

Follow the prompts to link your Vercel account.

### Option B: GitHub Integration
1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Add environment variables (same as `.env.local`)
5. Click **Deploy**

### Environment Variables in Vercel
Add these in **Vercel → Project → Settings → Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_API_URL` (optional)
- `WHATSAPP_API_TOKEN` (optional)

---

## 6️⃣ Post-Deployment Checklist

- [ ] Schema SQL executed successfully
- [ ] Test login works for all 4 roles
- [ ] QR session creation works (Teacher)
- [ ] QR scanning works (Student)
- [ ] Attendance records appear in dashboard
- [ ] Parent can see child's attendance
- [ ] WhatsApp notifications sent (if configured)
- [ ] Rate limiting works on API endpoints
- [ ] Error pages display correctly (404, 500)

---

## 🔧 Troubleshooting

### "Invalid API Key" error
- Verify your Supabase URL and keys in `.env.local`
- Ensure the key format matches exactly (no extra spaces)

### "RLS policy violation" error
- Ensure the user has the correct role in the `profiles` table
- Check that RLS policies in `schema.sql` were applied

### Login redirects to wrong dashboard
- Check the user's `role` field in `profiles` table
- The proxy middleware redirects based on role

### WhatsApp notifications not sending
- Verify `WHATSAPP_API_TOKEN` is set
- Check the `/api/notifications/send` endpoint logs
- Ensure parent phone numbers start with `62` (Indonesia)

---

## 📊 Architecture

```
src/
├── app/
│   ├── (auth)/login/          # Authentication
│   ├── (dashboard)/
│   │   ├── admin/             # Admin CRUD + Dashboard
│   │   ├── teacher/           # Sessions + QR + History
│   │   ├── student/           # Scanner + History
│   │   └── parent/            # Monitoring
│   ├── api/
│   │   ├── attendance/validate/  # QR validation
│   │   └── notifications/send/  # WhatsApp queue
│   ├── error.tsx              # Global error boundary
│   └── not-found.tsx          # 404 page
├── components/
│   ├── attendance/            # QR display, scanner, status badge
│   ├── dashboard/             # Stat cards
│   ├── layout/                # Sidebar, header
│   └── shared/                # Reusable UI
├── lib/
│   ├── supabase/              # Client, server, middleware
│   ├── audit.ts               # Audit logging
│   ├── rate-limit.ts          # API rate limiting
│   └── validations.ts         # Zod schemas
├── services/
│   └── whatsapp.ts            # WA gateway service
└── proxy.ts                   # Route protection middleware
```
