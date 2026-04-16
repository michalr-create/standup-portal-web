"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const supabase = getBrowserSupabase();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setErrorMessage(
        error.message === "Invalid login credentials"
          ? "Nieprawidlowy email lub haslo."
          : error.message
      );
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-neutral-950">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-2">parska — admin</h1>
        <p className="text-sm text-gray-400 mb-6">Zaloguj sie do panelu</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="twoj@email.pl"
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neutral-500"
              disabled={status === "submitting"}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-300 mb-2">
              Haslo
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neutral-500"
              disabled={status === "submitting"}
            />
          </div>

          {status === "error" && (
            <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting" || !email || !password}
            className="w-full py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:bg-neutral-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {status === "submitting" ? "Loguje..." : "Zaloguj"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-800 text-xs text-gray-500 text-center">
          Dostep tylko dla autoryzowanych uzytkownikow.
        </div>
      </div>
    </main>
  );
}
