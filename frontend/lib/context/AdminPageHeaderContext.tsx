"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminPageHeaderState = {
  title: string | null;
  subtitle: string | null;
};

type AdminPageHeaderContextValue = AdminPageHeaderState & {
  setHeader: (title: string | null, subtitle?: string | null) => void;
  clearHeader: () => void;
};

const AdminPageHeaderContext = createContext<AdminPageHeaderContextValue | null>(null);

export function AdminPageHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminPageHeaderState>({
    title: null,
    subtitle: null,
  });

  const setHeader = useCallback((title: string | null, subtitle: string | null = null) => {
    setState({ title, subtitle });
  }, []);

  const clearHeader = useCallback(() => {
    setState({ title: null, subtitle: null });
  }, []);

  const value = useMemo(
    () => ({ ...state, setHeader, clearHeader }),
    [state, setHeader, clearHeader],
  );

  return (
    <AdminPageHeaderContext.Provider value={value}>{children}</AdminPageHeaderContext.Provider>
  );
}

export function useAdminPageHeader() {
  const ctx = useContext(AdminPageHeaderContext);
  if (!ctx) {
    throw new Error("useAdminPageHeader must be used within AdminPageHeaderProvider");
  }
  return ctx;
}
