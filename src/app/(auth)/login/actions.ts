"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validations";

export interface LoginState {
  error?: string;
  success?: boolean;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const rawData = {
    username: (formData.get("username") as string)?.trim() || "",
    password: (formData.get("password") as string) || "",
  };

  // Validate input
  const validated = loginSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      error: validated.error.errors[0]?.message || "Data tidak valid",
    };
  }

  const { username, password } = validated.data;

  // Map username to email:
  // If input contains '@', use as-is.
  // Otherwise, default to username@slayer.test
  let email = username.toLowerCase();
  if (!email.includes("@")) {
    email = `${email}@slayer.test`;
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Username atau kata sandi tidak sesuai. Silakan coba lagi.",
    };
  }

  // Get user role for redirect
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Terjadi kesalahan. Silakan coba lagi." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "student";
  const dashboardPaths: Record<string, string> = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
  };

  redirect(dashboardPaths[role]);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
