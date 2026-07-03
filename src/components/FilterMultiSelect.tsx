"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FilterMultiSelect({
  label,
  opciones,
  seleccionados,
  onChange,
}: {
  label: string;
  opciones: { value: string; label: string }[];
  seleccionados: string[];
  onChange: (valores: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  function alternar(valor: string) {
    if (seleccionados.includes(valor)) {
      onChange(seleccionados.filter((v) => v !== valor));
    } else {
      onChange([...seleccionados, valor]);
    }
  }

  const textoBoton =
    seleccionados.length === 0
      ? label
      : seleccionados.length === 1
        ? opciones.find((o) => o.value === seleccionados[0])?.label ?? label
        : `${label} (${seleccionados.length})`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium outline-none transition-all duration-500 ease-spring ${
          seleccionados.length > 0
            ? "border-primary/50 bg-primary-dim text-primary-deep"
            : "border-silver-deep/60 bg-surface-2 text-muted"
        }`}
      >
        {textoBoton}
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute z-20 mt-2 w-56 rounded-2xl border border-silver-deep/60 bg-surface-2 p-2 shadow-lg">
            {seleccionados.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mb-1 flex w-full items-center rounded-lg px-3 py-1.5 text-left text-xs font-medium text-danger hover:bg-danger/10"
              >
                Limpiar selección
              </button>
            )}
            {opciones.map((opcion) => {
              const marcado = seleccionados.includes(opcion.value);
              return (
                <label
                  key={opcion.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors duration-200 hover:bg-primary-dim"
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(opcion.value)}
                    className="h-4 w-4 rounded border-silver-deep/60 accent-primary"
                  />
                  {opcion.label}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
