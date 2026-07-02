"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { normalizarNombre } from "./vendedoresService";
import { ESTADOS_SOLICITUD } from "./constants";

export type Sesion = { nombre: string; rol: "ADMIN" | "VENDEDOR" } | null;

type SessionContextValue = {
  sesion: Sesion;
  cargando: boolean;
  refrescar: () => Promise<void>;
  cerrarSesion: (motivo?: string) => Promise<void>;
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

  const cerrarSesion = useCallback(async (motivo?: string) => {
    await fetch("/api/session", { method: "DELETE" });
    setSesion(null);
    window.location.href = motivo ? `/login?motivo=${motivo}` : "/login";
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  // Corta el acceso al instante si un Admin revoca a este vendedor,
  // sin esperar a que la cookie de sesión expire.
  useEffect(() => {
    if (!sesion || sesion.rol !== "VENDEDOR") return;

    const id = normalizarNombre(sesion.nombre);
    if (!id) return;

    const unsub = onSnapshot(doc(db, "vendedores", id), (snap) => {
      const estado = snap.data()?.estado;
      if (snap.exists() && estado !== ESTADOS_SOLICITUD.APROBADO) {
        cerrarSesion("revocado");
      }
    });

    return () => unsub();
  }, [sesion, cerrarSesion]);

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
