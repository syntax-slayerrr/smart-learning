"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { studentSchema, teacherSchema, classSchema, parentSchema } from "@/lib/validations";
import { sendWhatsAppMessage, sendWhatsAppBatch } from "@/services/whatsapp";
import { sendPushNotification } from "@/lib/web-push";
import { waitUntil } from "@vercel/functions";

// ============================================
// STUDENT ACTIONS
// ============================================

export async function createStudent(formData: FormData) {
  const supabase = await createClient();

  const fullName = formData.get("full_name") as string;
  const nis = formData.get("nis") as string;
  
  // Auto-generate standardized email: [nama_depan].[nis]@smktarkid.sch.id
  const firstName = fullName ? fullName.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") : "siswa";
  const generatedEmail = `${firstName}.${nis}@smktarkid.sch.id`;

  const raw = {
    full_name: fullName,
    email: generatedEmail,
    nis: nis,
    class_id: (formData.get("class_id") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
  };

  const validated = studentSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message };
  }

  // Create auth user using Admin Client
  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: validated.data.email,
    password: "tarkid123", // Default password
    email_confirm: true,
    user_metadata: {
      full_name: validated.data.full_name,
      role: "student",
    },
  });

  let existingUserId: string | undefined;

  if (authError) {
    if (authError.message.includes("already registered")) {
      // Find existing user by email via profiles table (faster than listUsers)
      const { data: existingUser } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", validated.data.email)
        .single();
      if (existingUser) {
        existingUserId = existingUser.id;
        // Reset password to default for existing user
        await adminClient.auth.admin.updateUserById(existingUser.id, { 
          password: "tarkid123" 
        });
      } else {
        return { error: `Gagal menemukan akun yang sudah terdaftar.` };
      }
    } else {
      return { error: `Gagal membuat akun: ${authError.message}` };
    }
  }

  const userId = authData?.user?.id || existingUserId;

  if (!userId) {
    return { error: "Gagal mendapatkan User ID." };
  }

  // Create profile record manually (since trigger is disabled)
  // Use upsert to handle case where profile already exists
  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    email: validated.data.email,
    full_name: validated.data.full_name,
    role: "student",
  });

  if (profileError) {
    return { error: `Gagal membuat profil siswa: ${profileError.message}` };
  }

  // Create student record
  const { error: studentError } = await supabase.from("students").insert({
    profile_id: userId,
    nis: validated.data.nis,
    class_id: validated.data.class_id || null,
  });

  if (studentError) {
    return { error: `Gagal menyimpan data siswa: ${studentError.message}` };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

export async function deleteStudent(studentId: string) {
  const adminClient = createAdminClient();

  const { data: student } = await adminClient
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (student?.profile_id) {
    // Delete from auth.users (this will cascade to profiles and students)
    const { error } = await adminClient.auth.admin.deleteUser(student.profile_id);
    if (error) return { error: `Gagal menghapus auth user: ${error.message}` };
  } else {
    // Fallback if profile_id is missing somehow
    await adminClient.from("students").delete().eq("id", studentId);
  }

  revalidatePath("/admin/students");
  return { success: true };
}

export async function resetStudentDevice(studentId: string) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("students")
    .update({ device_id: null })
    .eq("id", studentId);

  if (error) return { error: error.message };

  revalidatePath("/admin/students");
  return { success: true };
}

export async function resetClassStudentDevices(classId?: string) {
  const adminClient = createAdminClient();
  let query = adminClient.from("students").update({ device_id: null });

  if (classId) {
    query = query.eq("class_id", classId);
  } else {
    // Reset all
    query = query.not("device_id", "is", null);
  }

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath("/admin/students");
  return { success: true };
}

export async function updateStudentClass(studentId: string, classId: string | null) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("students")
    .update({ class_id: classId })
    .eq("id", studentId);

  if (error) return { error: error.message };

  revalidatePath("/admin/students");
  return { success: true };
}

export async function updateStudentDetails(formData: FormData) {
  const adminClient = createAdminClient();
  const studentId = formData.get("id") as string;
  const fullName = formData.get("full_name") as string;
  const nis = formData.get("nis") as string;

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", studentId);
  if (profileError) return { error: profileError.message };

  const { error: studentError } = await adminClient
    .from("students")
    .update({ nis })
    .eq("id", studentId);
  if (studentError) return { error: studentError.message };

  revalidatePath("/admin/students");
  return { success: true };
}

// ============================================
// TEACHER ACTIONS
// ============================================

export async function createTeacher(formData: FormData) {
  const supabase = await createClient();

  const fullName = formData.get("full_name") as string;
  
  // Auto-generate standardized email: [nama_depan]@smktarkid.sch.id
  const firstName = fullName ? fullName.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") : "guru";
  const generatedEmail = `${firstName}@smktarkid.sch.id`;

  const raw = {
    full_name: fullName,
    email: generatedEmail,
    nip: formData.get("nip") as string,
    subject_ids: formData.getAll("subject_ids") as string[],
    phone: (formData.get("phone") as string) || undefined,
  };

  const validated = teacherSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message };
  }

  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: validated.data.email,
    password: "tarkid123",
    email_confirm: true,
    user_metadata: {
      full_name: validated.data.full_name,
      role: "teacher",
    },
  });

  let existingUserId: string | undefined;

  if (authError) {
    if (authError.message.includes("already registered")) {
      const { data: existingUser } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", validated.data.email)
        .single();
      if (existingUser) {
        existingUserId = existingUser.id;
        // Reset password to default for existing user
        await adminClient.auth.admin.updateUserById(existingUser.id, { 
          password: "tarkid123" 
        });
      } else {
        return { error: `Gagal menemukan akun guru yang sudah terdaftar.` };
      }
    } else {
      return { error: `Gagal membuat akun: ${authError.message}` };
    }
  }

  const userId = authData?.user?.id || existingUserId;

  if (!userId) {
    return { error: "Gagal mendapatkan User ID Guru." };
  }

  // Create profile record manually
  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    email: validated.data.email,
    full_name: validated.data.full_name,
    role: "teacher",
  });

  if (profileError) {
    return { error: `Gagal membuat profil guru: ${profileError.message}` };
  }

  const { data: teacherData, error: teacherError } = await adminClient.from("teachers").insert({
    profile_id: userId,
    nip: validated.data.nip,
  }).select("id").single();

  if (teacherError) {
    return { error: `Gagal menyimpan data guru: ${teacherError.message}` };
  }

  if (validated.data.subject_ids && validated.data.subject_ids.length > 0) {
    const tsData = validated.data.subject_ids.map(sid => ({
      teacher_id: teacherData.id,
      subject_id: sid
    }));
    await adminClient.from("teacher_subjects").insert(tsData);
  }

  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function deleteTeacher(teacherId: string) {
  const adminClient = createAdminClient();

  const { data: teacher } = await adminClient
    .from("teachers")
    .select("profile_id")
    .eq("id", teacherId)
    .single();

  if (teacher?.profile_id) {
    const { error } = await adminClient.auth.admin.deleteUser(teacher.profile_id);
    if (error) return { error: `Gagal menghapus auth user: ${error.message}` };
  } else {
    await adminClient.from("teachers").delete().eq("id", teacherId);
  }

  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function updateTeacherDetails(formData: FormData) {
  const adminClient = createAdminClient();
  const teacherId = formData.get("id") as string;
  const fullName = formData.get("full_name") as string;
  const nip = formData.get("nip") as string;
  const subjectIds = formData.getAll("subject_ids") as string[];

  // 1. Get the correct profile_id from teachers table
  const { data: teacher } = await adminClient
    .from("teachers")
    .select("profile_id")
    .eq("id", teacherId)
    .single();

  if (teacher?.profile_id) {
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", teacher.profile_id);
    if (profileError) return { error: profileError.message };
  }

  const { error: teacherError } = await adminClient
    .from("teachers")
    .update({ nip })
    .eq("id", teacherId);
  if (teacherError) return { error: teacherError.message };

  // Update teacher subjects
  if (subjectIds) {
    const { error: deleteError } = await adminClient.from("teacher_subjects").delete().eq("teacher_id", teacherId);
    if (deleteError) return { error: "Gagal menghapus mapel lama: " + deleteError.message };

    if (subjectIds.length > 0) {
      const tsData = subjectIds.map(sid => ({
        teacher_id: teacherId,
        subject_id: sid
      }));
      const { error: insertError } = await adminClient.from("teacher_subjects").insert(tsData);
      if (insertError) return { error: "Gagal menyimpan mapel baru: " + insertError.message };
    }
  }

  revalidatePath("/admin/teachers");
  return { success: true };
}

// ============================================
// CLASS ACTIONS
// ============================================

export async function createClass(formData: FormData) {
  const supabase = await createClient();

  const raw = {
    name: formData.get("name") as string,
    grade: formData.get("grade") as string,
    academic_year: formData.get("academic_year") as string,
    homeroom_teacher_id: (formData.get("homeroom_teacher_id") as string) || undefined,
  };

  const validated = classSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message };
  }

  const { error } = await supabase.from("classes").insert({
    name: validated.data.name,
    grade: validated.data.grade,
    academic_year: validated.data.academic_year,
    homeroom_teacher_id: validated.data.homeroom_teacher_id || null,
  });

  if (error) {
    return { error: `Gagal membuat kelas: ${error.message}` };
  }

  revalidatePath("/admin/classes");
  return { success: true };
}

export async function editClass(formData: FormData) {
  const supabase = await createClient();

  const classId = formData.get("id") as string;
  if (!classId) return { error: "ID kelas tidak ditemukan" };

  const raw = {
    name: formData.get("name") as string,
    grade: formData.get("grade") as string,
    academic_year: formData.get("academic_year") as string,
    homeroom_teacher_id: formData.get("homeroom_teacher_id") as string,
  };

  const validated = classSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message };
  }

  const is_active = formData.get("is_active") === "true";

  const { error } = await supabase
    .from("classes")
    .update({
      name: validated.data.name,
      grade: validated.data.grade,
      academic_year: validated.data.academic_year,
      homeroom_teacher_id: validated.data.homeroom_teacher_id || null,
      is_active: is_active,
    })
    .eq("id", classId);

  if (error) {
    return { error: `Gagal mengubah kelas: ${error.message}` };
  }

  revalidatePath("/admin/classes");
  return { success: true };
}

export async function deleteClass(classId: string) {
  const supabase = await createClient();
  
  // PROTEKSI KETAT: Jangan izinkan hapus kelas jika masih ada siswa
  const { count: studentCount, error: countError } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);

  if (studentCount && studentCount > 0) {
    return { error: `Tidak dapat menghapus kelas ini karena masih ada ${studentCount} siswa di dalamnya. Silakan pindahkan siswa ke kelas lain terlebih dahulu atau nonaktifkan kelas ini.` };
  }

  // Cek apakah ada data absensi/sesi yang terikat
  const { count: sessionCount } = await supabase
    .from("attendance_sessions")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);

  if (sessionCount && sessionCount > 0) {
    return { error: `Tidak dapat menghapus kelas karena sudah memiliki riwayat absensi. Sebaiknya Anda menonaktifkan kelas ini (Arsip) agar data riwayat tidak hilang.` };
  }

  const { error } = await supabase.from("classes").delete().eq("id", classId);
  
  if (error) {
    return { error: "Gagal menghapus kelas karena masih ada data yang terikat (Foreign Key)." };
  }

  revalidatePath("/admin/classes");
  return { success: true };
}

// ============================================
// PARENT ACTIONS
// ============================================

export async function createParent(formData: FormData) {
  const adminClient = createAdminClient();

  const raw = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone_wa: formData.get('phone_wa') as string,
    student_id: formData.get('student_id') as string,
    relationship: formData.get('relationship') as any,
  };

  const validated = parentSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message };
  }

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: validated.data.email,
    password: 'tarkid123',
    email_confirm: true,
    user_metadata: {
      full_name: validated.data.full_name,
      role: 'parent',
    },
  });

  let userId: string | undefined;

  if (authError) {
    if (authError.message.includes('already registered')) {
      const { data: existingUser } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', validated.data.email)
        .single();
      if (existingUser) {
        userId = existingUser.id;
        await adminClient.auth.admin.updateUserById(existingUser.id, { password: 'tarkid123' });
      } else {
        return { error: 'Gagal menemukan akun orang tua.' };
      }
    } else {
      return { error: authError.message };
    }
  } else {
    userId = authData.user?.id;
  }

  if (!userId) return { error: 'Gagal mendapatkan User ID.' };

  // Create profile
  await adminClient.from('profiles').upsert({
    id: userId,
    email: validated.data.email,
    full_name: validated.data.full_name,
    role: 'parent',
    phone: validated.data.phone_wa,
  });

  // Create parent record
  const { data: parent, error: parentErr } = await adminClient
    .from('parents')
    .upsert({
      profile_id: userId,
      phone_wa: validated.data.phone_wa,
    })
    .select('id')
    .single();

  if (parentErr) return { error: parentErr.message };

  // Link to student
  await adminClient.from('student_parents').upsert({
    student_id: validated.data.student_id,
    parent_id: parent.id,
    relationship: validated.data.relationship,
  });

  revalidatePath('/admin/parents');
  revalidatePath('/admin/students');
  return { success: true };
}

export async function updateParent(formData: FormData) {
  const adminClient = createAdminClient();

  const id = formData.get('id') as string;
  const raw = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone_wa: formData.get('phone_wa') as string,
    student_id: formData.get('student_id') as string,
    relationship: formData.get('relationship') as any,
  };

  const validated = parentSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message };
  }

  // Get parent's profile_id
  const { data: parent } = await adminClient
    .from('parents')
    .select('profile_id')
    .eq('id', id)
    .single();

  if (!parent) return { error: "Data orang tua tidak ditemukan" };

  // Update profile
  await adminClient.from('profiles').update({
    email: validated.data.email,
    full_name: validated.data.full_name,
    phone: validated.data.phone_wa,
  }).eq('id', parent.profile_id);

  // Update parent
  await adminClient.from('parents').update({
    phone_wa: validated.data.phone_wa,
  }).eq('id', id);

  // Update link to student (assuming 1 parent = 1 student for this simple form)
  // Delete existing links for this parent and insert new one
  await adminClient.from('student_parents').delete().eq('parent_id', id);
  
  if (validated.data.student_id) {
    await adminClient.from('student_parents').insert({
      student_id: validated.data.student_id,
      parent_id: id,
      relationship: validated.data.relationship,
    });
  }

  revalidatePath('/admin/parents');
  revalidatePath('/admin/students');
  return { success: true };
}

export async function deleteParent(id: string) {
  const adminClient = createAdminClient();
  
  // Get parent's profile_id
  const { data: parent } = await adminClient
    .from('parents')
    .select('profile_id')
    .eq('id', id)
    .single();

  if (!parent) return { error: "Data orang tua tidak ditemukan" };

  // Delete from student_parents
  await adminClient.from('student_parents').delete().eq('parent_id', id);

  // Delete from parents
  await adminClient.from('parents').delete().eq('id', id);

  // Delete from profiles
  await adminClient.from('profiles').delete().eq('id', parent.profile_id);
  
  // Optionally delete auth user
  await adminClient.auth.admin.deleteUser(parent.profile_id);

  revalidatePath('/admin/parents');
  revalidatePath('/admin/students');
  return { success: true };
}

// ============================================
// SUBJECT ACTIONS
// ============================================

export async function createSubject(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const code = formData.get('code') as string;

  if (!name) return { error: 'Nama mata pelajaran wajib diisi.' };

  const { error } = await supabase.from('subjects').insert({ name, code: code || null });

  if (error) return { error: error.message };

  revalidatePath('/admin/subjects');
  return { success: true };
}

// ============================================
// SCHEDULE ACTIONS
// ============================================

export async function createSchedule(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const class_id = formData.get("class_id") as string;
  const teacher_id = formData.get("teacher_id") as string;
  const subject_id = formData.get("subject_id") as string;
  const day_of_week = parseInt(formData.get("day_of_week") as string);
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;

  if (!class_id || !teacher_id || !subject_id || isNaN(day_of_week) || !start_time || !end_time) {
    return { error: "Semua kolom jadwal wajib diisi." };
  }

  const { error } = await supabase
    .from("schedules")
    .insert({
      class_id,
      teacher_id,
      subject_id,
      day_of_week,
      start_time,
      end_time,
    });

  if (error) {
    console.error("Failed to create schedule:", error);
    return { error: "Gagal menyimpan jadwal. Periksa kembali input Anda." };
  }

  revalidatePath("/admin/schedules");
  return { success: true };
}

export async function deleteSchedule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/schedules");
  return { success: true };
}

export async function updateSchedule(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  const class_id = formData.get("class_id") as string;
  const teacher_id = formData.get("teacher_id") as string;
  const subject_id = formData.get("subject_id") as string;
  const day_of_week = parseInt(formData.get("day_of_week") as string);
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;

  if (!id || !class_id || !teacher_id || !subject_id || isNaN(day_of_week) || !start_time || !end_time) {
    return { error: "Semua kolom jadwal wajib diisi." };
  }

  const { error } = await supabase
    .from("schedules")
    .update({
      class_id,
      teacher_id,
      subject_id,
      day_of_week,
      start_time,
      end_time,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update schedule:", error);
    return { error: "Gagal memperbarui jadwal. Periksa kembali input Anda." };
  }

  revalidatePath("/admin/schedules");
  return { success: true };
}

export async function deleteSubject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/subjects');
  return { success: true };
}

export async function processAdminCardScan(studentId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Get student record
  const { data: student } = await adminClient
    .from("students")
    .select("id, class_id, profiles(full_name)")
    .eq("id", studentId)
    .single();

  if (!student) {
    return { error: "Data siswa tidak ditemukan" };
  }

  if (!student.class_id) {
    return { error: "Siswa belum terdaftar di kelas manapun." };
  }

  // 2. Timezone & Schedule Logic (WIB)
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000));
  const dayOfWeek = nowWib.getUTCDay(); // 0-6
  const currentTime = nowWib.getUTCHours().toString().padStart(2, '0') + ':' + 
                      nowWib.getUTCMinutes().toString().padStart(2, '0');
  const today = nowWib.toISOString().split('T')[0];

  // Skip if Sunday
  if (dayOfWeek === 0) {
    return { error: "Hari Minggu libur sekolah." };
  }

  // Check holiday
  const { data: holiday } = await adminClient
    .from("holidays")
    .select("description")
    .eq("holiday_date", today)
    .maybeSingle();

  if (holiday) {
    return { error: `Hari ini adalah hari libur: ${holiday.description || "Libur Sekolah"}` };
  }

  // 3. Find matching schedule
  const { data: schedule } = await adminClient
    .from("schedules")
    .select(`
      id, class_id, teacher_id, subject_id, start_time, end_time,
      subjects ( name )
    `)
    .eq("class_id", student.class_id)
    .eq("day_of_week", dayOfWeek)
    .lte("start_time", currentTime)
    .gte("end_time", currentTime)
    .maybeSingle();

  if (!schedule) {
    return { error: `Tidak ada jam pelajaran aktif untuk kelas ini saat ini (${currentTime}).` };
  }

  const subjectName = Array.isArray(schedule.subjects) 
    ? schedule.subjects[0]?.name 
    : (schedule.subjects as any)?.name;

  // 4. Find or create session
  let session: any = null;
  const { data: existingSession } = await adminClient
    .from("attendance_sessions")
    .select("id, status, subject_start_time, qr_token, created_at")
    .eq("class_id", student.class_id)
    .eq("session_date", today)
    .eq("subject_id", schedule.subject_id)
    .eq("status", "active")
    .maybeSingle();

  if (existingSession) {
    session = existingSession;
  } else {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const autoToken = `auto-${schedule.id}-${today}`;
    const { data: newSession, error: createErr } = await adminClient
      .from("attendance_sessions")
      .insert({
        teacher_id: schedule.teacher_id,
        class_id: schedule.class_id,
        subject_id: schedule.subject_id,
        subject_start_time: schedule.start_time,
        session_date: today,
        qr_token: autoToken,
        qr_expires_at: `${today}T${schedule.end_time}+07:00`,
        status: "active"
      })
      .select("id, status, subject_start_time, qr_token, created_at")
      .single();
    
    if (createErr) {
      // try reusing existing session if token already exists (avoids race/duplicate errors)
      const { data: existingByToken } = await adminClient
        .from("attendance_sessions")
        .select("id, status, subject_start_time, qr_token, created_at")
        .eq("qr_token", autoToken)
        .maybeSingle();

      if (existingByToken) {
        session = existingByToken;
      } else {
        return { error: "Gagal membuat sesi otomatis." };
      }
    } else {
      session = newSession;
    }
  }

  // 5. Check duplicate
  const { data: existing } = await adminClient
    .from("attendance_records")
    .select("id")
    .eq("session_id", session.id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (existing) {
    return { error: "Siswa sudah diabsen untuk sesi ini." };
  }

  // 6. Lateness logic
  let isLate = false;
  const lateThresholdMinutes = 15;
  const [startHour, startMin] = (session.subject_start_time || "07:00").split(':').map(Number);
  const currentHour = nowWib.getUTCHours();
  const currentMin = nowWib.getUTCMinutes();
  
  const currentTotalMins = currentHour * 60 + currentMin;
  const startTotalMins = startHour * 60 + startMin;
  
  isLate = (currentTotalMins - startTotalMins) > lateThresholdMinutes;
  const status = isLate ? "late" : "present";

  // 7. Insert record
  const { data: record, error: insertError } = await adminClient
    .from("attendance_records")
    .insert({
      session_id: session.id,
      student_id: student.id,
      status,
      scanned_at: nowUtc.toISOString(),
      recorded_by: user.id,
      notes: "Scanned by TU/Admin"
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: "Gagal menyimpan absensi." };
  }

  // 5. Fetch parent details and WA token to send WhatsApp
  const [{ data: studentData }, { data: settings }] = await Promise.all([
    adminClient
      .from("students")
      .select(`
        profiles (full_name),
        student_parents (
          parents (
            phone_wa,
            profiles ( push_subscription )
          )
        )
      `)
      .eq("id", studentId)
      .single(),
    adminClient
      .from("school_settings")
      .select("wa_token, wa_provider")
      .single()
  ]);

  const studentName = (studentData?.profiles as any)?.full_name || "Siswa";
  const parentLinks = studentData?.student_parents || [];

  
  waitUntil((async () => {
    for (const link of (parentLinks as any[])) {
      const phone = link.parents?.phone_wa;
      const pushSub = link.parents?.profiles?.push_subscription;
      const nowTime = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', timeZone: "Asia/Jakarta" });
      
      if (phone) {
        const message = `Halo Bapak/Ibu,\n\nKami menginfokan bahwa ananda *${studentName}* telah *HADIR* pada kelas *${subjectName}* pada pukul ${nowTime} WIB.\n\nTerima kasih. (Kartu Absen Khusus Terverifikasi oleh TU)`;
        
        await sendWhatsAppMessage(
          { phone, message },
          { token: settings?.wa_token, provider: settings?.wa_provider }
        );
      }
      
      if (pushSub) {
        await sendPushNotification(pushSub, {
          title: "✅ Notifikasi Kehadiran",
          body: `Ananda ${studentName} tercatat Hadir pada mata pelajaran ${subjectName}.\nWaktu: ${nowTime} WIB`,
          url: "/parent",
        }).catch(console.error);
      }
      
      if (phone) {
        // Delay 2-4 seconds between messages to prevent WhatsApp/Fonnte blocking
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      }
    }
  })());

  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  
  return { 
    success: true, 
    studentName,
    status
  };
}

// ============================================
// PUSH NOTIFICATION ONBOARDING
// ============================================

export async function broadcastPWAInvitations() {
  const adminClient = createAdminClient();
  
  // Get all parents whose profile has no push_subscription and has a phone number
  const { data: parents } = await adminClient
    .from("parents")
    .select(`
      id,
      phone_wa,
      profiles (
        id,
        full_name,
        push_subscription
      )
    `);

  if (!parents) return { error: "Gagal mengambil data orang tua" };

  const targetParents: any[] = parents.filter((p: any) => p.phone_wa && !(p.profiles as any)?.push_subscription);
  
  if (targetParents.length === 0) {
    return { success: true, message: "Semua orang tua sudah mengaktifkan notifikasi atau tidak memiliki nomor WA." };
  }

  // Fetch school settings to get WA token and domain if possible
  const { data: settings } = await adminClient
    .from("school_settings")
    .select("wa_token, wa_provider")
    .single();

  const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://aplikasi-absen-sekolah-smk.vercel.app";

  waitUntil((async () => {
    for (const parent of targetParents) {
      const parentName = parent.profiles?.full_name || "Bapak/Ibu";
      const message = `Halo ${parentName},\n\nMari tingkatkan kecepatan info absensi ananda dengan mengaktifkan fitur Notifikasi Langsung (Tanpa Lemot) di HP Anda.\n\nSilakan klik link khusus ini:\n${domain}/parent?setup=notif\n\nTerima kasih!`;
      
      await sendWhatsAppMessage(
        { phone: parent.phone_wa, message },
        { token: settings?.wa_token, provider: settings?.wa_provider }
      );
      
      // Delay to respect rate limits
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
    }
  })());

  return { success: true, message: `Berhasil menjadwalkan undangan ke ${targetParents.length} orang tua.` };
}

export async function broadcastTeacherPWAInvitations() {
  const adminClient = createAdminClient();
  
  // Get all teachers whose profile has no push_subscription and has a phone number
  const { data: teachers } = await adminClient
    .from("teachers")
    .select(`
      id,
      phone_wa,
      profiles (
        id,
        full_name,
        push_subscription
      )
    `);

  if (!teachers) return { error: "Gagal mengambil data guru" };

  const targetTeachers: any[] = teachers.filter((t: any) => t.phone_wa && !(t.profiles as any)?.push_subscription);
  
  if (targetTeachers.length === 0) {
    return { success: true, message: "Semua guru sudah mengaktifkan notifikasi atau tidak memiliki nomor WA." };
  }

  // Fetch school settings to get WA token and domain if possible
  const { data: settings } = await adminClient
    .from("school_settings")
    .select("wa_token, wa_provider")
    .single();

  const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://aplikasi-absen-sekolah-smk.vercel.app";

  waitUntil((async () => {
    for (const teacher of targetTeachers) {
      const teacherName = teacher.profiles?.full_name || "Bapak/Ibu";
      const message = `Halo ${teacherName},\n\nJangan sampai terlewat jadwal mengajar! Mari aktifkan Pengingat Jadwal Kelas otomatis di HP Anda.\n\nSilakan klik link khusus ini:\n${domain}/teacher?setup=notif\n\nTerima kasih!`;
      
      await sendWhatsAppMessage(
        { phone: teacher.phone_wa, message },
        { token: settings?.wa_token, provider: settings?.wa_provider }
      );
      
      // Delay to respect rate limits
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
    }
  })());

  return { success: true, message: `Berhasil menjadwalkan undangan ke ${targetTeachers.length} guru.` };
}

export async function sendDailyAttendanceSummaryWA() {
  const adminClient = createAdminClient();
  
  // Fix timezone to WIB (Asia/Jakarta)
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
  const year = nowWib.getUTCFullYear();
  const month = String(nowWib.getUTCMonth() + 1).padStart(2, '0');
  const day = String(nowWib.getUTCDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  
  const displayDate = nowWib.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Fetch all attendance records for today
  // We use inner join to filter records by today's session_date
  const { data: records, error } = await adminClient
    .from("attendance_records")
    .select(`
      id,
      status,
      scanned_at,
      attendance_sessions!inner ( session_date, subject_start_time, subjects(name) ),
      students (
        id,
        profiles (full_name),
        student_parents (
          parents ( id, phone_wa, profiles(full_name) )
        )
      )
    `)
    .eq("attendance_sessions.session_date", today);

  if (error || !records || records.length === 0) {
    return { success: true, message: "Tidak ada data absensi untuk hari ini." };
  }

  // 2. Fetch school settings to get WA token
  const { data: settings } = await adminClient
    .from("school_settings")
    .select("school_name, wa_token, wa_provider")
    .single();

  if (!settings?.wa_token) {
    return { error: "Token API WhatsApp belum dikonfigurasi di Pengaturan." };
  }

  // 3. Group records by Student
  const studentMap = new Map<string, any>();
  
  for (const record of records) {
    const student = record.students as any;
    if (!student || !student.id) continue;
    
    if (!studentMap.has(student.id)) {
      studentMap.set(student.id, {
        studentName: student.profiles?.full_name || "Siswa",
        parents: student.student_parents || [],
        attendances: []
      });
    }
    
    const session = Array.isArray(record.attendance_sessions) ? record.attendance_sessions[0] : record.attendance_sessions;
    const subjectName = (session?.subjects as any)?.name || "Pelajaran";
    const startTime = session?.subject_start_time?.substring(0, 5) || "00:00";
    
    let statusLabel = "HADIR ✅";
    if (record.status === "absent") statusLabel = "ALPA ❌";
    else if (record.status === "late") statusLabel = "TERLAMBAT ⚠️";
    else if (record.status === "sick") statusLabel = "SAKIT 🤒";
    else if (record.status === "excused") statusLabel = "IZIN 📋";
    
    studentMap.get(student.id).attendances.push({
      subjectName,
      startTime,
      statusLabel
    });
  }

  // 4. Send background queue
  const targets: { phone: string, message: string, studentId: string, parentId: string }[] = [];

  for (const [studentId, data] of studentMap.entries()) {
    // Sort attendances by time
    data.attendances.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    
    // Spintax (Randomizer) untuk menghindari deteksi spam berulang & Memancing Balasan (Two-Way Communication)
    const greetings = ["Halo Bapak/Ibu,", "Salam sejahtera Bapak/Ibu,", "Hai Bapak/Ibu Wali Murid,", "Yth. Bapak/Ibu,"];
    const closings = [
      "Mohon balas pesan ini dengan ketik *'SIAP'* sebagai konfirmasi bahwa laporan sudah dibaca.",
      "Sebagai tanda terima, mohon berkenan membalas pesan ini dengan ketik *'TERIMA KASIH'*.",
      "Mohon konfirmasinya dengan membalas pesan ini *'OKE'* agar sistem kami mencatat pesan telah tersampaikan.",
      "Silakan balas *'SIAP'* jika Bapak/Ibu sudah menerima rekap absensi ananda hari ini."
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    const randomClosing = closings[Math.floor(Math.random() * closings.length)];

    // Build text
    let text = `${randomGreeting}\nBerikut adalah *REKAP ABSENSI HARIAN* di 🏫 ${settings.school_name || "Sekolah"}\n\n`;
    text += `Nama Siswa: *${data.studentName}*\nTanggal: ${displayDate}\n\n`;
    
    data.attendances.forEach((att: any, index: number) => {
      text += `${index + 1}. ${att.subjectName} (${att.startTime}) - *${att.statusLabel}*\n`;
    });
    
    text += `\nMohon Bapak/Ibu memantau perkembangan ananda. ${randomClosing}`;
    
    // Add to targets for each parent phone
    for (const link of data.parents) {
      const phone = link.parents?.phone_wa;
      const parentId = link.parents?.id;
      if (phone && parentId) {
        targets.push({ phone, message: text, studentId, parentId });
      }
    }
  }

  // Filter already sent messages today to allow resuming the loop
  const { data: sentLogs } = await adminClient
    .from("notifications")
    .select("parent_id, student_id")
    .gte("created_at", `${today}T00:00:00+07:00`)
    .eq("status", "sent");
    
  const sentSet = new Set(sentLogs?.map(log => `${log.student_id}_${log.parent_id}`) || []);

  const unsentTargets = targets.filter(t => !sentSet.has(`${t.studentId}_${t.parentId}`));

  if (unsentTargets.length === 0) {
    return { success: true, message: "Semua rekap untuk hari ini sudah berhasil dikirim. Tidak ada antrean tersisa." };
  }

  // We append timestamp here to ensure uniqueness to avoid Spam Filter
  const timestampTargets = unsentTargets.map(t => {
    const currentTime = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" });
    return {
      ...t,
      message: `${t.message}\n\n_(Pesan otomatis dikirim pada: ${currentTime})_`
    };
  });

  return { success: true, targets: timestampTargets };
}

export async function sendWhatsAppDirect(target: { phone: string, message: string, studentId?: string, parentId?: string }) {
  const adminClient = createAdminClient();
  const { data: settings } = await adminClient
    .from("school_settings")
    .select("wa_token, wa_provider")
    .single();

  if (!settings?.wa_token) return { success: false, error: "Token API WhatsApp belum dikonfigurasi." };

  const result = await sendWhatsAppMessage(
    { phone: target.phone, message: target.message },
    { token: settings.wa_token, provider: settings.wa_provider }
  );

  // Log to notifications table if studentId and parentId are provided
  if (target.studentId && target.parentId) {
    const { error: insertError } = await adminClient.from("notifications").insert({
      parent_id: target.parentId,
      student_id: target.studentId,
      message: target.message,
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
    });

    if (insertError) {
      console.error("Gagal mencatat log notifikasi:", insertError);
    }
  }

  return result;
}
