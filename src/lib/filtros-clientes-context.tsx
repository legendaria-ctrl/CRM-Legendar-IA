"use client";

import { createContext, useContext, useState, ReactNode } from "react";

const OPCION_TODOS = "TODOS";

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
  limpiarFiltros: (criteriosDefault: string[]) => void;
};

const FiltrosClientesContext = createContext<FiltrosClientesValue | null>(null);

// Vive en el layout (que no se desmonta al navegar entre el listado y la
// ficha de un cliente), para que los filtros del dashboard sigan aplicados
// al volver de ver un cliente en vez de resetearse.
export function FiltrosClientesProvider({ children }: { children: ReactNode }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
  const [filtroRegion, setFiltroRegion] = useState<string>(OPCION_TODOS);
  const [filtroBienvenida, setFiltroBienvenida] = useState<string[]>([]);
  const [filtroTags, setFiltroTags] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [filtroEtiquetas, setFiltroEtiquetas] = useState<string[]>([]);
  const [orden, setOrden] = useState<"recientes" | "antiguos">("recientes");
  const [criteriosBusqueda, setCriteriosBusqueda] = useState<string[]>([]);

  function limpiarFiltros(criteriosDefault: string[]) {
    setBusqueda("");
    setFiltroEstado([]);
    setFiltroRegion(OPCION_TODOS);
    setFiltroBienvenida([]);
    setFiltroTags([]);
    setFiltroVendedor([]);
    setFiltroEtiquetas([]);
    setCriteriosBusqueda(criteriosDefault);
  }

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
