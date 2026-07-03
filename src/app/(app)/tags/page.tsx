"use client";

import { useEffect, useState } from "react";
import { Tag as TagIcon, Plus, Trash2, LoaderCircle } from "lucide-react";
import { suscribirTags, crearTag, eliminarTag, TagDoc } from "@/lib/tagsService";
import { useSesion } from "@/lib/session-context";

export default function TagsPage() {
  const { sesion } = useSesion();
  const [tags, setTags] = useState<TagDoc[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = suscribirTags(setTags);
    return () => unsub();
  }, []);

  async function handleCrear() {
    if (!sesion || !nombre.trim() || creando) return;
    setCreando(true);
    try {
      await crearTag(nombre, sesion.nombre);
      setNombre("");
    } finally {
      setCreando(false);
    }
  }

  async function handleEliminar(tag: TagDoc) {
    const confirmado = window.confirm(
      `¿Eliminar la etiqueta "${tag.nombre}"? Los clientes que ya la tengan asignada la conservarán.`
    );
    if (!confirmado) return;
    setEliminandoId(tag.id);
    try {
      await eliminarTag(tag.id);
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Catálogo
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tags</h1>
        <p className="text-sm text-muted">
          Crea etiquetas reutilizables para clasificar clientes de distintas certificaciones.
        </p>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <div className="flex gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCrear()}
              placeholder="Nombre de la etiqueta (ej. Certificación 2026)"
              className="flex-1 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
            <button
              onClick={handleCrear}
              disabled={!nombre.trim() || creando}
              className="group flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
            >
              <span className="py-2">Crear tag</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
                {creando ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                ) : (
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core rounded-[calc(2rem-0.5rem)] p-2 md:p-3">
          {tags === null ? (
            <p className="px-6 py-16 text-center text-sm text-muted">Cargando etiquetas…</p>
          ) : tags.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <TagIcon className="h-6 w-6 text-muted" strokeWidth={1.5} />
              <p className="text-sm text-muted">Todavía no hay etiquetas creadas.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-silver">
              {tags.map((tag) => (
                <li
                  key={tag.id}
                  className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tag.color}`}
                  >
                    <TagIcon className="h-3 w-3" strokeWidth={2} />
                    {tag.nombre}
                  </span>
                  <button
                    onClick={() => handleEliminar(tag)}
                    disabled={eliminandoId === tag.id}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    {eliminandoId === tag.id ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
