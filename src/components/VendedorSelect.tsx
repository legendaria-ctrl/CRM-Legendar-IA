"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, UserCheck } from "lucide-react";
import { suscribirVendedores } from "@/lib/vendedoresService";
import { ESTADOS_SOLICITUD } from "@/lib/constants";

export function VendedorSelect({
  valor,
  onChange,
  placeholder = "Sin vendedor asignado",
}: {
  valor: string | null;
  onChange: (nombre: string | null) => void | Promise<void>;
  placeholder?: string;
}) {
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const unsub = suscribirVendedores((lista) => {
      setVendedores(
        lista.filter((v) => v.estado === ESTADOS_SOLICITUD.APROBADO).map((v) => v.nombre)
      );
    });
    return () => unsub();
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return vendedores;
    return vendedores.filter((v) => v.toLowerCase().includes(texto));
  }, [vendedores, busqueda]);

  function seleccionar(nombre: string | null) {
    onChange(nombre);
    setAbierto(false);
    setBusqueda("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex min-w-[220px] items-center justify-between gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
      >
        <span className={`flex items-center gap-1.5 ${valor ? "text-foreground" : "text-muted/60"}`}>
          <UserCheck className="h-3.5 w-3.5 flex-none" strokeWidth={1.75} />
          {valor || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 flex-none text-muted" strokeWidth={1.75} />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute z-20 mt-2 w-64 rounded-2xl border border-silver-deep/60 bg-surface-2 p-2 shadow-lg">
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-silver-deep/60 bg-surface px-3 py-2">
              <Search className="h-3.5 w-3.5 flex-none text-muted" strokeWidth={1.75} />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar vendedor…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
              />
            </div>

            <div className="max-h-56 overflow-y-auto">
              <button
                type="button"
                onClick={() => seleccionar(null)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-primary-dim ${
                  !valor ? "text-primary" : "text-muted"
                }`}
              >
                Sin vendedor asignado
              </button>

              {filtrados.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">No hay vendedores aprobados.</p>
              ) : (
                filtrados.map((nombre) => (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => seleccionar(nombre)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-primary-dim ${
                      valor === nombre ? "font-medium text-primary" : "text-foreground"
                    }`}
                  >
                    {nombre}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
