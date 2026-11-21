"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { listFeaturedIds } from "@/app/admin/viewer-actions";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type AdminModeValue = {
  isAdmin: boolean;
  featuredIds: readonly number[];
  featuredReady: boolean;
  featuredError: string | null;
  refreshFeatured: () => Promise<void>;
};

const EMPTY: AdminModeValue = {
  isAdmin: false,
  featuredIds: [],
  featuredReady: false,
  featuredError: null,
  refreshFeatured: async () => {},
};

const AdminModeContext = createContext<AdminModeValue | null>(null);

export function useAdminMode(): AdminModeValue {
  return useContext(AdminModeContext) ?? EMPTY;
}

export default function AdminModeProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [featuredIds, setFeaturedIds] = useState<number[]>([]);
  const [featuredReady, setFeaturedReady] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const ticket = useRef(0);

  const refreshFeatured = useCallback(async () => {
    const mine = ++ticket.current;
    const ids = await listFeaturedIds();
    if (ticket.current !== mine) return;
    setFeaturedIds(ids);
    setFeaturedReady(true);
    setFeaturedError(null);
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const mine = ++ticket.current;
      if (!session) {
        setIsAdmin(false);
        setFeaturedIds([]);
        setFeaturedReady(false);
        setFeaturedError(null);
        return;
      }
      void (async () => {
        const result = await supabase.rpc("is_admin");
        if (ticket.current !== mine) return;
        const allowed = result.error == null && result.data === true;
        setIsAdmin(allowed);
        if (!allowed) {
          setFeaturedIds([]);
          setFeaturedReady(false);
          setFeaturedError(null);
          return;
        }
        try {
          const ids = await listFeaturedIds();
          if (ticket.current !== mine) return;
          setFeaturedIds(ids);
          setFeaturedReady(true);
          setFeaturedError(null);
        } catch {
          if (ticket.current !== mine) return;
          setFeaturedIds([]);
          setFeaturedReady(false);
          setFeaturedError("Nie udało się odczytać polecanych.");
        }
      })();
    });
    return () => {
      ticket.current += 1;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ isAdmin, featuredIds, featuredReady, featuredError, refreshFeatured }),
    [isAdmin, featuredIds, featuredReady, featuredError, refreshFeatured],
  );

  return <AdminModeContext.Provider value={value}>{children}</AdminModeContext.Provider>;
}
