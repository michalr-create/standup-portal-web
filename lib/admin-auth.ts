import { forbidden } from "next/navigation";
import { readAdminAccess } from "@/lib/admin-access";
import { getServerSupabase } from "@/lib/supabase-server";

export async function getAdminAccess() {
  const supabase = await getServerSupabase();
  return readAdminAccess({
    auth: {
      getUser: () => supabase.auth.getUser(),
    },
    rpc: async (fn) => {
      const { data, error } = await supabase.rpc(fn);
      return {
        data: data === true ? true : data === false ? false : null,
        error: error ? { message: error.message } : null,
      };
    },
  });
}

/** Server actions and route handlers under /admin. Not a signed-in check. */
export async function requireAuth() {
  const { user, gate } = await getAdminAccess();
  if (gate === "forbidden") forbidden();
  if (gate !== "allow" || !user) {
    throw new Error("Unauthorized");
  }
  return user;
}
