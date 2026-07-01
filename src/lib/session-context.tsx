"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Sesion = { nombre: string; rol: "ADMIN" | "VENDEDOR" } | null;

type SessionContextValue = {
  sesion: Sesion;
  cargando: boolean;
  refrescar: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    const res = await fetch("/api/session");
    const data = await res.json();
    setSesion(data.session);
    setCargando(false);
  }, []);

  const cerrarSesion = useCallback(async () => {
    await fetch("/api/session", { method: "DELETE" });
    setSesion(null);
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  return (
    <SessionContext.Provider value={{ sesion, cargando, refrescar, cerrarSesion }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSesion() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de SessionProvider");
  return ctx;
}
