"use client";

import { useState } from "react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Search, History, LoaderCircle } from "lucide-react";
import { obtenerActividad, ActividadDoc } from "@/lib/activityService";
import { EVENTO_LABEL, TipoEvento } from "@/lib/constants";
import { descargarCSV } from "@/lib/csv";

function aInputDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default function ActividadPage() {
  const hoy = new Date();
  const [desde, setDesde] = useState(aInputDate(hoy));
  const [hasta, setHasta] = useState(aInputDate(hoy));
  const [autor, setAutor] = useState("");
  const [resultados, setResultados] = useState<ActividadDoc[] | null>(null);
  const [cargando, setCargando] = useState(false);

  async function buscar(rangoDesde = desde, rangoHasta = hasta) {
    setCargando(true);
    try {
      const datos = await obtenerActividad({
        desde: startOfDay(new Date(rangoDesde + "T00:00:00")),
        hasta: endOfDay(new Date(rangoHasta + "T00:00:00")),
        autor: autor.trim() || undefined,
      });
      setResultados(datos);
    } finally {
      setCargando(false);
    }
  }

  function preset(tipo: "hoy" | "semana") {
    const ahora = new Date();
    if (tipo === "hoy") {
      const d = aInputDate(ahora);
      setDesde(d);
      setHasta(d);
      buscar(d, d);
      return;
    }
    const inicio = aInputDate(startOfWeek(ahora, { weekStartsOn: 1 }));
    const fin = aInputDate(endOfWeek(ahora, { weekStartsOn: 1 }));
    setDesde(inicio);
    setHasta(fin);
    buscar(inicio, fin);
  }

  function exportar() {
    if (!resultados || resultados.length === 0) return;
    const filas = resultados.map((r) => [
      r.fecha ? format(r.fecha.toDate(), "yyyy-MM-dd HH:mm:ss") : "",
      r.autor,
      r.autorRol,
      EVENTO_LABEL[r.accion as TipoEvento] ?? r.accion,
      r.clienteNombre,
      r.nota ?? "",
    ]);
    descargarCSV(
      `actividad_${desde}_a_${hasta}.csv`,
      ["Fecha", "Autor", "Rol", "Acción", "Cliente", "Detalle"],
      filas
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Bitácora
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Actividad de usuarios
        </h1>
        <p className="text-sm text-muted">
          Registro de cada movimiento (altas, invitaciones, aceptaciones, renovaciones y notas) de todos los usuarios.
        </p>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => preset("hoy")}
              className="rounded-full bg-surface-2 px-4 py-2 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:bg-primary-dim hover:text-primary-deep"
            >
              Hoy
            </button>
            <button
              onClick={() => preset("semana")}
              className="rounded-full bg-surface-2 px-4 py-2 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:bg-primary-dim hover:text-primary-deep"
            >
              Esta semana
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Desde
              </span>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Hasta
              </span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <label className="flex flex-1 min-w-[180px] flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Usuario (opcional)
              </span>
              <input
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Nombre exacto del usuario"
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <button
              onClick={() => buscar()}
              disabled={cargando}
              className="group flex items-center gap-2 rounded-full bg-primary py-2.5 pl-5 pr-5 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
            >
              {cargando ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Search className="h-4 w-4" strokeWidth={1.75} />
              )}
              Buscar
            </button>

            <button
              onClick={exportar}
              disabled={!resultados || resultados.length === 0}
              className="flex items-center gap-2 rounded-full border border-silver-deep/60 bg-surface-2 py-2.5 pl-5 pr-5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-primary disabled:opacity-40"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Descargar CSV
            </button>
          </div>
        </div>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core rounded-[calc(2rem-0.5rem)] p-2 md:p-3">
          {resultados === null ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <History className="h-6 w-6 text-muted" strokeWidth={1.5} />
              <p className="text-sm text-muted">
                Elige un rango de fechas y da clic en Buscar para ver los movimientos.
              </p>
            </div>
          ) : resultados.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted">
              No hay movimientos en ese rango.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Acción</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver">
                  {resultados.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {r.fecha
                          ? format(r.fecha.toDate(), "d MMM yyyy, HH:mm", { locale: es })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{r.autor}</span>
                        <span className="ml-1.5 text-xs text-muted">({r.autorRol})</span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {EVENTO_LABEL[r.accion as TipoEvento] ?? r.accion}
                      </td>
                      <td className="px-4 py-3 text-muted">{r.clienteNombre}</td>
                      <td className="px-4 py-3 text-muted">{r.nota || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
