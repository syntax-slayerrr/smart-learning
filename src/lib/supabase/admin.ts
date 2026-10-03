import { createClient } from "@supabase/supabase-js";

/**
 * Special Supabase client that uses the SERVICE_ROLE_KEY.
 * This client bypasses RLS and has full administrative access.
 * ONLY use this in Server Actions/Routes and never expose to client.
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
