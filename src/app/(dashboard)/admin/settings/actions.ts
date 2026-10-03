"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getSchoolSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_settings")
    .select("*")
    .limit(1)
    .single();

  return data;
}

export async function saveSchoolSettings(formData: {
  school_name?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  max_students_per_device?: number;
  late_tolerance_minutes?: number;
  wa_token?: string | null;
  wa_provider?: string;
  wa_notify_mode?: string; // "daily_recap" | "per_session"
}) {
  const adminClient = createAdminClient();

  // Check if settings row exists
  const { data: existing } = await adminClient
    .from("school_settings")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    const { error } = await adminClient
      .from("school_settings")
      .update(formData)
      .eq("id", existing.id);

    if (error) {
      console.error("Update settings error:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await adminClient
      .from("school_settings")
      .insert(formData);

    if (error) {
      console.error("Save settings error:", error);
      return { error: error.message };
    }
  }

  revalidatePath("/admin/settings");
  return { success: true };
}
export async function testWhatsApp(phone: string) {
  const adminClient = createAdminClient();
  const { data: settings } = await adminClient
    .from("school_settings")
    .select("wa_token, wa_provider")
    .limit(1)
    .single();

  if (!settings?.wa_token) {
    return { error: "Token API belum diatur. Simpan pengaturan terlebih dahulu." };
  }

  const { sendWhatsAppMessage } = await import("@/services/whatsapp");
  
  const result = await sendWhatsAppMessage(
    {
      phone,
      message: "🚀 *Test Koneksi AbsenSMK*\n\nJika Anda menerima pesan ini, integrasi WhatsApp telah berhasil dikonfigurasi.",
    },
    {
      token: settings.wa_token,
      provider: settings.wa_provider,
    }
  );

  return result;
}

// ============================================
// HOLIDAY ACTIONS
// ============================================

export async function getHolidays() {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("holidays")
    .select("*")
    .order("holiday_date", { ascending: true });
  return data || [];
}

export async function addHoliday(date: string, description: string) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("holidays")
    .insert({ holiday_date: date, description });

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function deleteHoliday(id: string) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("holidays")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function syncNationalHolidays(year: number) {
  const adminClient = createAdminClient();
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`);
    if (!res.ok) throw new Error("Gagal terhubung ke API Hari Libur Internasional");
    
    const data = await res.json();
    
    let addedCount = 0;
    for (const item of data) {
      if (!item.date || !item.localName) continue;
      
      // Check if already exists to avoid duplicates
      const { data: existing } = await adminClient
        .from("holidays")
        .select("id")
        .eq("holiday_date", item.date)
        .maybeSingle();
        
      if (!existing) {
        await adminClient.from("holidays").insert({
          holiday_date: item.date,
          description: item.localName
        });
        addedCount++;
      }
    }

    revalidatePath("/admin/settings");
    return { success: true, count: addedCount };
  } catch (err: any) {
    return { error: err.message || "Gagal menyinkronkan data." };
  }
}
