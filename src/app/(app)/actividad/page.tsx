"use client";

import { useEffect, useState } from "react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Search, History, LoaderCircle } from "lucide-react";
import { obtenerActividad, obtenerAutoresUnicos, ActividadDoc } from "@/lib/activityService";
import { obtenerContactosPorIds } from "@/lib/clientesService";
import { suscribirVendedores } from "@/lib/vendedoresService";
import { EVENTO_LABEL, TipoEvento, ESTADOS_SOLICITUD } from "@/lib/constants";
import { descargarCSV } from "@/lib/csv";
import { UsuarioSelect } from "@/components/UsuarioSelect";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { CERTIFICACIONES } from "@/lib/certificaciones";

function aInputDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default function ActividadPage() {
  const hoy = new Date();
  const [desde, setDesde] = useState(aInputDate(hoy));
  const [hasta, setHasta] = useState(aInputDate(hoy));
  const [autor, setAutor] = useState("");
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [filtroEtiquetas, setFiltroEtiquetas] = useState<string[]>([]);
  const [vendedoresAprobados, setVendedoresAprobados] = useState<string[]>([]);
  const [resultados, setResultados] = useState<ActividadDoc[] | null>(null);
  const [vendedorPorCliente, setVendedorPorCliente] = useState<Record<string, string | null>>({});
  const [etiquetasPorCliente, setEtiquetasPorCliente] = useState<Record<string, string[]>>({});
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    obtenerAutoresUnicos().then(setUsuarios);
    const unsub = suscribirVendedores((lista) => {
      setVendedoresAprobados(
        lista.filter((v) => v.estado === ESTADOS_SOLICITUD.APROBADO).map((v) => v.nombre)
      );
    });
    return () => unsub();
  }, []);

  async function buscar(rangoDesde = desde, rangoHasta = hasta) {
    setCargando(true);
    try {
      const datos = await obtenerActividad({
        desde: startOfDay(new Date(rangoDesde + "T00:00:00")),
        hasta: endOfDay(new Date(rangoHasta + "T00:00:00")),
        autor: autor.trim() || undefined,
      });
      const contactos = await obtenerContactosPorIds(datos.map((r) => r.clienteId));
      setVendedorPorCliente(
        Object.fromEntries(Object.entries(contactos).map(([id, c]) => [id, c.vendedor]))
      );
      setEtiquetasPorCliente(
        Object.fromEntries(Object.entries(contactos).map(([id, c]) => [id, c.etiquetas]))
      );
      setResultados(datos);
    } finally {
      setCargando(false);
    }
  }

  const resultadosFiltrados = (resultados ?? []).filter((r) => {
    if (filtroVendedor.length > 0) {
      const vendedor = vendedorPorCliente[r.clienteId];
      if (!vendedor || !filtroVendedor.includes(vendedor)) return false;
    }
    if (filtroEtiquetas.length > 0) {
      const etiquetas = etiquetasPorCliente[r.clienteId] ?? [];
      if (!etiquetas.some((e) => filtroEtiquetas.includes(e))) return false;
    }
    return true;
  });

  function preset(tipo: "hoy" | "semana" | "mes") {
    const ahora = new Date();
    if (tipo === "hoy") {
      const d = aInputDate(ahora);
      setDesde(d);
      setHasta(d);
      buscar(d, d);
      return;
    }
    if (tipo === "mes") {
      const inicio = aInputDate(startOfMonth(ahora));
      const fin = aInputDate(endOfMonth(ahora));
      setDesde(inicio);
      setHasta(fin);
      buscar(inicio, fin);
      return;
    }
    const inicio = aInputDate(startOfWeek(ahora, { weekStartsOn: 1 }));
    const fin = aInputDate(endOfWeek(ahora, { weekStartsOn: 1 }));
    setDesde(inicio);
    setHasta(fin);
    buscar(inicio, fin);
  }

  async function exportar() {
    if (resultadosFiltrados.length === 0) return;
    setExportando(true);
    try {
      const contactos = await obtenerContactosPorIds(resultadosFiltrados.map((r) => r.clienteId));

      const filas = resultadosFiltrados.map((r) => {
        const contacto = contactos[r.clienteId];
        return [
          r.fecha ? format(r.fecha.toDate(), "yyyy-MM-dd HH:mm:ss") : "",
          r.clienteNombre,
          contacto?.email ?? "",
          contacto?.telefono ?? "",
          r.autor,
          r.autorRol,
          EVENTO_LABEL[r.accion as TipoEvento] ?? r.accion,
          contacto?.notas ?? "",
          r.nota ?? "",
        ];
      });

      descargarCSV(
        `actividad_${desde}_a_${hasta}.csv`,
        ["Fecha", "Nombre", "Correo", "Teléfono", "Autor", "Rol", "Acción", "Notas del cliente", "Detalle"],
        filas
      );
    } finally {
      setExportando(false);
    }
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
            <button
              onClick={() => preset("mes")}
              className="rounded-full bg-surface-2 px-4 py-2 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:bg-primary-dim hover:text-primary-deep"
            >
              Este mes
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

            <label className="flex w-56 flex-none flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Usuario (opcional)
              </span>
              <UsuarioSelect usuarios={usuarios} valor={autor} onChange={setAutor} />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Vendedor
              </span>
              <FilterMultiSelect
                label="Todos los vendedores"
                opciones={vendedoresAprobados.map((v) => ({ value: v, label: v }))}
                seleccionados={filtroVendedor}
                onChange={setFiltroVendedor}
                buscable
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Certificación
              </span>
              <FilterMultiSelect
                label="Todas las certificaciones"
                opciones={CERTIFICACIONES.map((c) => ({ value: c.etiqueta, label: c.nombre }))}
                seleccionados={filtroEtiquetas}
                onChange={setFiltroEtiquetas}
              />
            </div>

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
              disabled={resultadosFiltrados.length === 0 || exportando}
              className="flex items-center gap-2 rounded-full border border-silver-deep/60 bg-surface-2 py-2.5 pl-5 pr-5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-primary disabled:opacity-40"
            >
              {exportando ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Download className="h-4 w-4" strokeWidth={1.75} />
              )}
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
          ) : resultadosFiltrados.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted">
              No hay movimientos en ese rango{filtroVendedor.length > 0 ? " para ese vendedor" : ""}.
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
                  {resultadosFiltrados.map((r) => (
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
