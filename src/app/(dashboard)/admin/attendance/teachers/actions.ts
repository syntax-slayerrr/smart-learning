"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleTeacherPresence(sessionId: string, currentPresence: string | null) {
  const supabase = await createClient();
  
  // If currently present, make it null (absent). If currently absent, make it present (current time).
  const newValue = currentPresence ? null : new Date().toISOString();
  
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ teacher_present_at: newValue })
    .eq("id", sessionId);
    
  if (error) {
    return { error: error.message };
  }
  
  revalidatePath("/admin/attendance/teachers");
  revalidatePath("/admin/reports");
  
  return { success: true };
}
