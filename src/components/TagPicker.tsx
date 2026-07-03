"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Tag as TagIcon } from "lucide-react";
import { suscribirTags, crearTag, TagDoc } from "@/lib/tagsService";
import { useSesion } from "@/lib/session-context";

export function TagPicker({
  seleccionados,
  onAgregar,
  disabled = false,
}: {
  seleccionados: string[];
  onAgregar: (tags: string[]) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { sesion } = useSesion();
  const [tags, setTags] = useState<TagDoc[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const unsub = suscribirTags(setTags);
    return () => unsub();
  }, []);

  const disponibles = useMemo(
    () => tags.filter((t) => !seleccionados.includes(t.nombre)),
    [tags, seleccionados]
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return disponibles;
    return disponibles.filter((t) => t.nombre.toLowerCase().includes(texto));
  }, [disponibles, busqueda]);

  const coincideExacto = disponibles.some(
    (t) => t.nombre.toLowerCase() === busqueda.trim().toLowerCase()
  );
  const puedeCrear = busqueda.trim() !== "" && !coincideExacto;

  async function agregarExistente(nombre: string) {
    if (procesando) return;
    setProcesando(true);
    try {
      await onAgregar([nombre]);
      setBusqueda("");
    } finally {
      setProcesando(false);
    }
  }

  async function crearYAgregar() {
    if (!sesion || procesando || !busqueda.trim()) return;
    setProcesando(true);
    try {
      const tag = await crearTag(busqueda, sesion.nombre);
      if (tag) await onAgregar([tag.nombre]);
      setBusqueda("");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-silver-deep/60 px-3 py-1.5 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:border-primary/50 hover:text-primary disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Agregar tag
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
                placeholder="Buscar o crear tag…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {filtrados.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => agregarExistente(tag.nombre)}
                  disabled={procesando}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors duration-200 hover:bg-primary-dim disabled:opacity-50"
                >
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${tag.color}`}>
                    <TagIcon className="h-2.5 w-2.5" strokeWidth={2} />
                    {tag.nombre}
                  </span>
                </button>
              ))}
              {filtrados.length === 0 && !puedeCrear && (
                <p className="px-3 py-2 text-xs text-muted">Sin resultados.</p>
              )}
              {puedeCrear && (
                <button
                  type="button"
                  onClick={crearYAgregar}
                  disabled={procesando}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary-dim disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Crear "{busqueda.trim()}"
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
