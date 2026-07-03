"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export function UsuarioSelect({
  usuarios,
  valor,
  onChange,
}: {
  usuarios: string[];
  valor: string;
  onChange: (nombre: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return usuarios;
    return usuarios.filter((u) => u.toLowerCase().includes(texto));
  }, [usuarios, busqueda]);

  function cerrar() {
    setAbierto(false);
    setBusqueda("");
  }

  function seleccionar(nombre: string) {
    onChange(nombre);
    cerrar();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex min-w-[200px] items-center justify-between gap-2 rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
      >
        <span className={valor ? "text-foreground" : "text-muted/60"}>
          {valor || "Todos los usuarios"}
        </span>
        <ChevronDown className="h-4 w-4 flex-none text-muted" strokeWidth={1.75} />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={cerrar} />
          <div className="absolute z-20 mt-2 w-64 rounded-2xl border border-silver-deep/60 bg-surface-2 p-2 shadow-lg">
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-silver-deep/60 bg-surface px-3 py-2">
              <Search className="h-3.5 w-3.5 flex-none text-muted" strokeWidth={1.75} />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar usuario…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
              />
            </div>

            <div className="max-h-56 overflow-y-auto">
              <button
                type="button"
                onClick={() => seleccionar("")}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-primary-dim ${
                  !valor ? "text-primary" : "text-muted"
                }`}
              >
                Todos los usuarios
              </button>

              {filtrados.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">Sin resultados.</p>
              ) : (
                filtrados.map((nombre) => (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => seleccionar(nombre)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200 hover:bg-primary-dim ${
                      valor === nombre ? "text-primary font-medium" : "text-foreground"
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
