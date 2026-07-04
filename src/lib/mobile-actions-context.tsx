"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type AccionMovil = {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  activo?: boolean;
  disabled?: boolean;
};

type MobileActionsValue = {
  acciones: AccionMovil[];
  setAcciones: (acciones: AccionMovil[]) => void;
};

const MobileActionsContext = createContext<MobileActionsValue | null>(null);

export function MobileActionsProvider({ children }: { children: ReactNode }) {
  const [acciones, setAccionesState] = useState<AccionMovil[]>([]);
  const setAcciones = useCallback((nuevas: AccionMovil[]) => setAccionesState(nuevas), []);

  return (
    <MobileActionsContext.Provider value={{ acciones, setAcciones }}>
      {children}
    </MobileActionsContext.Provider>
  );
}

export function useMobileActions() {
  const ctx = useContext(MobileActionsContext);
  if (!ctx) throw new Error("useMobileActions debe usarse dentro de MobileActionsProvider");
  return ctx;
}
