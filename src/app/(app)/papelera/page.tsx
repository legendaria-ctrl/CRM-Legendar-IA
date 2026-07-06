"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  suscribirPapelera,
  restaurarClienteDePapelera,
  eliminarClientePermanente,
  ClienteDoc,
} from "@/lib/clientesService";
import { aFecha } from "@/lib/membership";
import { useSesion } from "@/lib/session-context";
import { PAPELERA_DIAS } from "@/lib/constants";
import { ShieldAlert, Trash2, RotateCcw, LoaderCircle, Recycle } from "lucide-react";

function diasTranscurridos(fecha: Date | null): number {
  if (!fecha) return 0;
  const ms = Date.now() - fecha.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function PapeleraPage() {
  const { sesion, cargando } = useSesion();
  const [clientes, setClientes] = useState<ClienteDoc[] | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [purgados, setPurgados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sesion?.rol !== "ADMIN") return;
    const unsub = suscribirPapelera(setClientes);
    return () => unsub();
  }, [sesion?.rol]);

  // Purga oportunista: como no hay tareas programadas en el servidor, al
  // abrir la papelera se eliminan definitivamente los que ya cumplieron
  // los PAPELERA_DIAS días.
  useEffect(() => {
    if (!sesion || sesion.rol !== "ADMIN" || !clientes) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    const vencidos = clientes.filter(
      (c) => !purgados.has(c.id) && diasTranscurridos(aFecha(c.fechaEliminacion)) >= PAPELERA_DIAS
    );
    if (vencidos.length === 0) return;

    setPurgados((prev) => {
      const copia = new Set(prev);
      vencidos.forEach((c) => copia.add(c.id));
      return copia;
    });

    Promise.all(vencidos.map((c) => eliminarClientePermanente(c.id, c.nombre, autor))).catch(
      (err) => console.error("Error purgando clientes de la papelera:", err)
    );
  }, [clientes, sesion, purgados]);

  if (cargando) {
    return <div className="py-16 text-center text-sm text-muted">Cargando…</div>;
  }

  if (sesion?.rol !== "ADMIN") {
    return (
      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col items-center gap-3 rounded-[calc(2rem-0.5rem)] p-16 text-center">
          <ShieldAlert className="h-6 w-6 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-muted">Solo un administrador puede ver la papelera.</p>
        </div>
      </div>
    );
  }

  async function restaurar(c: ClienteDoc) {
    if (!sesion) return;
    setProcesando(c.id);
    try {
      await restaurarClienteDePapelera(c.id, c.nombre, { nombre: sesion.nombre, rol: sesion.rol });
    } finally {
      setProcesando(null);
    }
  }

  async function eliminarDefinitivo(c: ClienteDoc) {
    if (!sesion) return;
    const confirmado = window.confirm(
      `¿Eliminar definitivamente a "${c.nombre}"? Esta acción no se puede deshacer y se perderá toda su información.`
    );
    if (!confirmado) return;
    setProcesando(c.id);
    try {
      await eliminarClientePermanente(c.id, c.nombre, { nombre: sesion.nombre, rol: sesion.rol });
    } finally {
      setProcesando(null);
    }
  }

  const visibles = (clientes ?? []).filter((c) => !purgados.has(c.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Papelera
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Clientes eliminados
        </h1>
        <p className="text-sm text-muted">
          Se conservan por {PAPELERA_DIAS} días con toda su información. Puedes restaurarlos tal
          como estaban o eliminarlos definitivamente antes de que se borren solos.
        </p>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core rounded-[calc(2rem-0.5rem)] p-2 md:p-3">
          {clientes === null ? (
            <p className="px-6 py-16 text-center text-sm text-muted">Cargando…</p>
          ) : visibles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Recycle className="h-6 w-6 text-muted" strokeWidth={1.5} />
              <p className="text-sm text-muted">La papelera está vacía.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-silver">
              {visibles.map((c) => {
                const dias = diasTranscurridos(aFecha(c.fechaEliminacion));
                const diasRestantes = Math.max(PAPELERA_DIAS - dias, 0);
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{c.nombre}</p>
                      <p className="truncate text-xs text-muted">{c.email || "Sin correo"}</p>
                      <p className="text-xs text-warning">
                        Se elimina definitivamente en {diasRestantes} día{diasRestantes === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <button
                        onClick={() => restaurar(c)}
                        disabled={procesando === c.id}
                        className="flex items-center gap-1.5 rounded-full bg-success/10 px-4 py-2 text-xs font-medium text-success transition-all duration-500 ease-spring hover:bg-success/20 active:scale-[0.98] disabled:opacity-50"
                      >
                        {procesando === c.id ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                        Restaurar
                      </button>
                      <button
                        onClick={() => eliminarDefinitivo(c)}
                        disabled={procesando === c.id}
                        className="flex items-center gap-1.5 rounded-full bg-danger/10 px-4 py-2 text-xs font-medium text-danger transition-all duration-500 ease-spring hover:bg-danger/20 active:scale-[0.98] disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        Eliminar definitivo
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Link href="/" className="text-xs font-medium text-muted hover:text-primary">
        ← Volver a clientes
      </Link>
    </div>
  );
}
