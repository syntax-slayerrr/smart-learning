-- Tambahkan kolom wa_notify_mode ke tabel school_settings
-- "daily_recap" = Admin kirim 1 rekap manual per hari per siswa (Default)
-- "per_session" = Sistem otomatis kirim WA tiap sesi kelas selesai
ALTER TABLE school_settings 
ADD COLUMN IF NOT EXISTS wa_notify_mode TEXT NOT NULL DEFAULT 'daily_recap';

COMMENT ON COLUMN school_settings.wa_notify_mode IS 'Mode pengiriman WA: daily_recap (rekap harian manual) atau per_session (otomatis tiap sesi)';
