"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CERTIFICACIONES, Certificacion, certificacionPorId } from "./certificaciones";

const STORAGE_KEY = "certificacionActualId";

type CertificacionContextValue = {
  certificacionActual: Certificacion | null;
  setCertificacionActual: (id: string | null) => void;
  hidratado: boolean;
};

const CertificacionContext = createContext<CertificacionContextValue | undefined>(undefined);

export function CertificacionProvider({ children }: { children: React.ReactNode }) {
  const [certificacionActualId, setCertificacionActualId] = useState<string | null>(null);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    setCertificacionActualId(guardado);
    setHidratado(true);
  }, []);

  function setCertificacionActual(id: string | null) {
    setCertificacionActualId(id);
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  const certificacionActual = hidratado ? certificacionPorId(certificacionActualId) : null;

  return (
    <CertificacionContext.Provider
      value={{ certificacionActual, setCertificacionActual, hidratado }}
    >
      {children}
    </CertificacionContext.Provider>
  );
}

export function useCertificacion() {
  const ctx = useContext(CertificacionContext);
  if (!ctx) throw new Error("useCertificacion debe usarse dentro de CertificacionProvider");
  return ctx;
}

export { CERTIFICACIONES };
