import type { User } from "@supabase/supabase-js";

export type AdminGate = "allow" | "login" | "forbidden";

export function adminGate(userId: string | null, isAdmin: boolean): AdminGate {
  if (!userId) return "login";
  if (!isAdmin) return "forbidden";
  return "allow";
}

type AdminProbe = {
  auth: {
    getUser: () => Promise<{
      data: { user: User | null };
      error: { message: string } | null;
    }>;
  };
  rpc: (
    fn: "is_admin"
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
};

/**
 * Signed-in is not enough. Admin is `public.is_admin()` (security definer),
 * which is true only for rows in public.admins. Any error fails closed.
 */
export async function readAdminAccess(supabase: AdminProbe): Promise<{
  user: User | null;
  gate: AdminGate;
}> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, gate: "login" };
  }

  let allowed = false;
  try {
    const result = await supabase.rpc("is_admin");
    allowed = result.error == null && result.data === true;
  } catch {
    allowed = false;
  }

  return { user: data.user, gate: adminGate(data.user.id, allowed) };
}
