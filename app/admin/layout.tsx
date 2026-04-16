import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/supabase-server";
import LogoutButton from "./components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sprawdz czy jestesmy na stronie logowania - jesli tak, nie waliduj sesji
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("referer") || "";
  const isLoginPage = pathname.includes("/admin/login");

  const user = await getCurrentUser();

  // Redirect tylko gdy nie jestesmy na stronie logowania i nie ma usera
  if (!user && !isLoginPage) {
    redirect("/admin/login");
  }

  // Na stronie logowania - renderuj tylko children, bez layoutu panelu
  if (isLoginPage || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-lg">
              parska / admin
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link href="/admin" className="text-gray-300 hover:text-white">
                Moderacja
              </Link>
              <Link href="/admin/standuperzy" className="text-gray-300 hover:text-white">
                Standuperzy
              </Link>
              <Link href="/admin/formaty" className="text-gray-300 hover:text-white">
                Formaty
              </Link>
              <Link href="/admin/zrodla" className="text-gray-300 hover:text-white">
                Zrodla
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">
              {user.email}
            </span>
            <LogoutButton />
            <Link
              href="/"
              target="_blank"
              className="text-xs text-gray-400 hover:text-white"
            >
              Portal
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
