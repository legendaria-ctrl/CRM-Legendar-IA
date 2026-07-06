"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useCertificacion } from "./certificacion-context";

const OPCION_TODOS = "TODOS";
const CRITERIOS_BUSQUEDA_DEFAULT = ["nombre", "correo", "telefono", "notas", "historial"];

type FiltrosClientesValue = {
  busqueda: string;
  setBusqueda: (v: string) => void;
  filtroEstado: string[];
  setFiltroEstado: (v: string[]) => void;
  filtroRegion: string;
  setFiltroRegion: (v: string) => void;
  filtroBienvenida: string[];
  setFiltroBienvenida: (v: string[]) => void;
  filtroTags: string[];
  setFiltroTags: (v: string[]) => void;
  filtroVendedor: string[];
  setFiltroVendedor: (v: string[]) => void;
  filtroEtiquetas: string[];
  setFiltroEtiquetas: (v: string[]) => void;
  orden: "recientes" | "antiguos";
  setOrden: (v: "recientes" | "antiguos") => void;
  criteriosBusqueda: string[];
  setCriteriosBusqueda: (v: string[]) => void;
  limpiarFiltros: () => void;
};

const FiltrosClientesContext = createContext<FiltrosClientesValue | null>(null);

// Vive en el layout (que no se desmonta al navegar entre el listado y la
// ficha de un cliente), para que los filtros del dashboard sigan aplicados
// al volver de ver un cliente en vez de resetearse.
export function FiltrosClientesProvider({ children }: { children: ReactNode }) {
  const { certificacionActual } = useCertificacion();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
  const [filtroRegion, setFiltroRegion] = useState<string>(OPCION_TODOS);
  const [filtroBienvenida, setFiltroBienvenida] = useState<string[]>([]);
  const [filtroTags, setFiltroTags] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [filtroEtiquetas, setFiltroEtiquetas] = useState<string[]>([]);
  const [orden, setOrden] = useState<"recientes" | "antiguos">("recientes");
  const [criteriosBusqueda, setCriteriosBusqueda] = useState<string[]>(CRITERIOS_BUSQUEDA_DEFAULT);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado([]);
    setFiltroRegion(OPCION_TODOS);
    setFiltroBienvenida([]);
    setFiltroTags([]);
    setFiltroVendedor([]);
    setFiltroEtiquetas([]);
    setCriteriosBusqueda(CRITERIOS_BUSQUEDA_DEFAULT);
  }

  // Solo limpia los filtros cuando el usuario de verdad cambia de pestaña de
  // certificación (o de "No asignados" a una certificación, etc.) — nunca al
  // navegar entre el dashboard y la ficha de un cliente, ya que este
  // provider vive en el layout y no se desmonta con esas navegaciones.
  const certificacionAnteriorRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const idActual = certificacionActual?.id ?? null;
    if (
      certificacionAnteriorRef.current !== undefined &&
      certificacionAnteriorRef.current !== idActual
    ) {
      limpiarFiltros();
    }
    certificacionAnteriorRef.current = idActual;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificacionActual]);

  return (
    <FiltrosClientesContext.Provider
      value={{
        busqueda,
        setBusqueda,
        filtroEstado,
        setFiltroEstado,
        filtroRegion,
        setFiltroRegion,
        filtroBienvenida,
        setFiltroBienvenida,
        filtroTags,
        setFiltroTags,
        filtroVendedor,
        setFiltroVendedor,
        filtroEtiquetas,
        setFiltroEtiquetas,
        orden,
        setOrden,
        criteriosBusqueda,
        setCriteriosBusqueda,
        limpiarFiltros,
      }}
    >
      {children}
    </FiltrosClientesContext.Provider>
  );
}

export function useFiltrosClientes() {
  const ctx = useContext(FiltrosClientesContext);
  if (!ctx) throw new Error("useFiltrosClientes debe usarse dentro de FiltrosClientesProvider");
  return ctx;
}
