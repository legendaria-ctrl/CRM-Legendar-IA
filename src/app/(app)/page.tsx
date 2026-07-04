"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  suscribirClientes,
  ClienteDoc,
  enviarInvitacion,
  actualizarMensajeBienvenida,
  agregarTagsCliente,
  agregarEtiquetasCliente,
} from "@/lib/clientesService";
import { estadoActual, estaActivo, estadoBienvenidaDe, diasRestantes, aFecha } from "@/lib/membership";
import { StatusBadge } from "@/components/StatusBadge";
import { MensajeBienvenidaToggle } from "@/components/MensajeBienvenidaToggle";
import { InvitacionToggle } from "@/components/InvitacionToggle";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { TagPicker } from "@/components/TagPicker";
import { suscribirTags, TagDoc } from "@/lib/tagsService";
import { suscribirVendedores } from "@/lib/vendedoresService";
import { useSesion } from "@/lib/session-context";
import { useCertificacion } from "@/lib/certificacion-context";
import { CERTIFICACIONES } from "@/lib/certificaciones";
import {
  ESTADOS_CLIENTE,
  ESTADO_LABEL,
  EstadoCliente,
  ESTADOS_BIENVENIDA,
  BIENVENIDA_LABEL,
  EstadoBienvenida,
  ESTADOS_SOLICITUD,
  REGIONES,
  REGION_LABEL,
  Region,
} from "@/lib/constants";
import { descargarCSV } from "@/lib/csv";
import {
  Users,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Radio,
  Search,
  Download,
  X,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Send,
  CheckCheck,
  LoaderCircle,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

const OPCION_TODOS = "TODOS";

const OPCIONES_ESTADO = Object.values(ESTADOS_CLIENTE).map((estado) => ({
  value: estado,
  label: ESTADO_LABEL[estado as EstadoCliente],
}));

const OPCIONES_BIENVENIDA = Object.values(ESTADOS_BIENVENIDA).map((estado) => ({
  value: estado,
  label: BIENVENIDA_LABEL[estado as EstadoBienvenida],
}));

export default function DashboardPage() {
  const { sesion } = useSesion();
  const { certificacionActual } = useCertificacion();
  const [clientes, setClientes] = useState<ClienteDoc[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
  const [filtroRegion, setFiltroRegion] = useState<string>(OPCION_TODOS);
  const [filtroBienvenida, setFiltroBienvenida] = useState<string[]>([]);
  const [filtroTags, setFiltroTags] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [filtroEtiquetas, setFiltroEtiquetas] = useState<string[]>([]);
  const [orden, setOrden] = useState<"recientes" | "antiguos">("recientes");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [procesandoLote, setProcesandoLote] = useState(false);
  const [catalogoTags, setCatalogoTags] = useState<TagDoc[]>([]);
  const [vendedoresAprobados, setVendedoresAprobados] = useState<string[]>([]);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  useEffect(() => {
    const unsub = suscribirClientes(setClientes);
    const unsubTags = suscribirTags(setCatalogoTags);
    const unsubVendedores = suscribirVendedores((lista) => {
      setVendedoresAprobados(
        lista.filter((v) => v.estado === ESTADOS_SOLICITUD.APROBADO).map((v) => v.nombre)
      );
    });
    return () => {
      unsub();
      unsubTags();
      unsubVendedores();
    };
  }, []);

  const clientesDeCertificacion = useMemo(() => {
    const base = clientes ?? [];
    if (!certificacionActual) return base;
    return base.filter((c) => (c.etiquetas ?? []).includes(certificacionActual.etiqueta));
  }, [clientes, certificacionActual]);

  const conEstado = useMemo(
    () => clientesDeCertificacion.map((c) => ({ ...c, estadoCalculado: estadoActual(c) })),
    [clientesDeCertificacion]
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return conEstado.filter((c) => {
      if (texto) {
        const coincide =
          c.nombre.toLowerCase().includes(texto) ||
          (c.email ?? "").toLowerCase().includes(texto) ||
          (c.telefono ?? "").toLowerCase().includes(texto);
        if (!coincide) return false;
      }
      if (filtroEstado.length > 0 && !filtroEstado.includes(c.estadoCalculado)) return false;
      if (filtroRegion !== OPCION_TODOS && c.region !== filtroRegion) return false;
      if (
        filtroBienvenida.length > 0 &&
        !filtroBienvenida.includes(estadoBienvenidaDe(c.mensajeBienvenida))
      )
        return false;
      if (filtroTags.length > 0 && !(c.tags ?? []).some((t) => filtroTags.includes(t)))
        return false;
      if (filtroVendedor.length > 0 && !(c.vendedor && filtroVendedor.includes(c.vendedor)))
        return false;
      if (
        filtroEtiquetas.length > 0 &&
        !(c.etiquetas ?? []).some((e) => filtroEtiquetas.includes(e))
      )
        return false;
      return true;
    });
  }, [
    conEstado,
    busqueda,
    filtroEstado,
    filtroRegion,
    filtroBienvenida,
    filtroTags,
    filtroVendedor,
    filtroEtiquetas,
  ]);

  const ordenados = useMemo(() => {
    const copia = [...filtrados];
    copia.sort((a, b) => {
      const fechaA = aFecha(a.fechaLlegada)?.getTime() ?? 0;
      const fechaB = aFecha(b.fechaLlegada)?.getTime() ?? 0;
      return orden === "recientes" ? fechaB - fechaA : fechaA - fechaB;
    });
    return copia;
  }, [filtrados, orden]);

  const hayFiltrosActivos =
    busqueda.trim() !== "" ||
    filtroEstado.length > 0 ||
    filtroRegion !== OPCION_TODOS ||
    filtroBienvenida.length > 0 ||
    filtroTags.length > 0 ||
    filtroVendedor.length > 0 ||
    filtroEtiquetas.length > 0;

  useEffect(() => {
    setSeleccionados(new Set());
  }, [
    busqueda,
    filtroEstado,
    filtroRegion,
    filtroBienvenida,
    filtroTags,
    filtroVendedor,
    filtroEtiquetas,
    certificacionActual,
  ]);

  useEffect(() => {
    limpiarFiltros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificacionActual]);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado([]);
    setFiltroRegion(OPCION_TODOS);
    setFiltroBienvenida([]);
    setFiltroTags([]);
    setFiltroVendedor([]);
    setFiltroEtiquetas([]);
  }

  function alternarSeleccion(id: string) {
    setSeleccionados((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  function alternarTodos() {
    setSeleccionados((prev) =>
      prev.size === ordenados.length ? new Set() : new Set(ordenados.map((c) => c.id))
    );
  }

  async function aplicarAccionEnLote(accion: "invitacion" | "bienvenida") {
    if (!sesion || seleccionados.size === 0 || procesandoLote) return;
    setProcesandoLote(true);
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    try {
      const objetivos = ordenados.filter((c) => seleccionados.has(c.id));
      await Promise.all(
        objetivos.map((c) => {
          if (accion === "invitacion") {
            if (c.estado !== ESTADOS_CLIENTE.NUEVO) return Promise.resolve();
            return enviarInvitacion(c.id, c.nombre, autor);
          }
          if (estadoBienvenidaDe(c.mensajeBienvenida) === ESTADOS_BIENVENIDA.ENVIADA)
            return Promise.resolve();
          return actualizarMensajeBienvenida(c.id, c.nombre, autor, ESTADOS_BIENVENIDA.ENVIADA);
        })
      );
      setSeleccionados(new Set());
    } finally {
      setProcesandoLote(false);
    }
  }

  async function aplicarTagsEnLote(tags: string[]) {
    if (!sesion || seleccionados.size === 0) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    const objetivos = ordenados.filter((c) => seleccionados.has(c.id));
    await Promise.all(objetivos.map((c) => agregarTagsCliente(c.id, c.nombre, autor, tags)));
  }

  async function aplicarEtiquetaEnLote(etiqueta: string) {
    if (!sesion || seleccionados.size === 0 || procesandoLote) return;
    setProcesandoLote(true);
    try {
      const autor = { nombre: sesion.nombre, rol: sesion.rol };
      const objetivos = ordenados.filter((c) => seleccionados.has(c.id));
      await Promise.all(
        objetivos.map((c) => agregarEtiquetasCliente(c.id, c.nombre, autor, [etiqueta]))
      );
      setSeleccionados(new Set());
    } finally {
      setProcesandoLote(false);
    }
  }

  function exportarCSV() {
    if (ordenados.length === 0) return;
    const filas = ordenados.map((c) => {
      const llegada = aFecha(c.fechaLlegada);
      const vencimiento = aFecha(c.fechaVencimiento);
      return [
        c.nombre,
        c.email ?? "",
        c.telefono ?? "",
        c.region ? (REGION_LABEL[c.region as Region] ?? c.region) : "",
        ESTADO_LABEL[c.estadoCalculado],
        c.creadoPor,
        llegada ? llegada.toLocaleDateString("es-MX") : "",
        vencimiento ? vencimiento.toLocaleDateString("es-MX") : "",
        BIENVENIDA_LABEL[estadoBienvenidaDe(c.mensajeBienvenida)],
        c.notas ?? "",
      ];
    });

    descargarCSV(
      "clientes.csv",
      [
        "Nombre",
        "Correo",
        "Teléfono",
        "Región",
        "Estado",
        "Agregado por",
        "Fecha de llegada",
        "Fecha de vencimiento",
        "Mensaje de bienvenida",
        "Notas",
      ],
      filas
    );
  }

  if (clientes === null) {
    return <div className="py-16 text-center text-sm text-muted">Cargando clientes…</div>;
  }

  const total = conEstado.length;
  const activos = conEstado.filter((c) => c.estadoCalculado === ESTADOS_CLIENTE.ACTIVO).length;
  const porVencer = conEstado.filter(
    (c) =>
      c.estadoCalculado === ESTADOS_CLIENTE.ACTIVO &&
      (diasRestantes(c.fechaVencimiento) ?? 999) <= 30
  ).length;
  const nuevos = conEstado.filter((c) => c.estadoCalculado === ESTADOS_CLIENTE.NUEVO).length;

  const stats = [
    { label: "Clientes totales", value: total, icon: Users },
    { label: "Membresías activas", value: activos, icon: ShieldCheck },
    { label: "Por vencer (30 días)", value: porVencer, icon: AlertTriangle },
    { label: "Nuevos sin invitar", value: nuevos, icon: UserPlus },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          <Radio className="h-3 w-3 animate-pulse" strokeWidth={2} />
          Panel general · en vivo
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {certificacionActual ? `Clientes de ${certificacionActual.nombre}` : "Todos los clientes"}
        </h1>
        <p className="text-sm text-muted">
          {certificacionActual
            ? `Control de invitaciones y membresías anuales de ${certificacionActual.nombre}.`
            : "Vista general de clientes de todas las certificaciones."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="shell rounded-2xl p-1.5 diffused sm:rounded-[1.75rem] sm:p-2">
            <div className="core flex flex-col gap-1.5 rounded-[calc(1rem-0.375rem)] p-3 sm:gap-3 sm:rounded-[calc(1.75rem-0.5rem)] sm:p-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9 sm:rounded-xl">
                <Icon className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums text-foreground sm:text-2xl">{value}</p>
                <p className="text-[10px] text-muted sm:text-xs">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 transition-all duration-500 ease-spring focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
              <Search className="h-4 w-4 text-muted" strokeWidth={1.5} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, correo o teléfono…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
              />
            </div>

            <button
              onClick={() => setFiltrosAbiertos(true)}
              className="flex items-center justify-center gap-2 rounded-full border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:text-primary sm:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
              Filtros
              {hayFiltrosActivos && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={exportarCSV}
              disabled={ordenados.length === 0}
              className="flex items-center justify-center gap-2 rounded-full border border-silver-deep/60 bg-surface-2 px-5 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-primary disabled:opacity-40"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Descargar CSV</span>
            </button>
          </div>

          <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <button
              onClick={() => setOrden(orden === "recientes" ? "antiguos" : "recientes")}
              className="flex items-center justify-center gap-1.5 truncate rounded-full border border-silver-deep/60 bg-surface-2 px-4 py-2 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:text-primary sm:justify-start"
            >
              {orden === "recientes" ? (
                <ArrowDownWideNarrow className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
              ) : (
                <ArrowUpWideNarrow className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
              )}
              <span className="truncate">
                {orden === "recientes" ? "Más nuevos primero" : "Más antiguos primero"}
              </span>
            </button>

            <FilterMultiSelect
              label="Todos los estados"
              opciones={OPCIONES_ESTADO}
              seleccionados={filtroEstado}
              onChange={setFiltroEstado}
            />

            <select
              value={filtroRegion}
              onChange={(e) => setFiltroRegion(e.target.value)}
              className="w-full rounded-full border border-silver-deep/60 bg-surface-2 px-4 py-2 text-xs font-medium text-muted outline-none transition-all duration-500 ease-spring focus:border-primary/50 sm:w-auto"
            >
              <option value={OPCION_TODOS}>Todas las regiones</option>
              {Object.values(REGIONES).map((region) => (
                <option key={region} value={region}>
                  {REGION_LABEL[region as Region]}
                </option>
              ))}
            </select>

            <FilterMultiSelect
              label="Bienvenida WA: todos"
              opciones={OPCIONES_BIENVENIDA}
              seleccionados={filtroBienvenida}
              onChange={setFiltroBienvenida}
            />

            <FilterMultiSelect
              label="Todos los tags"
              opciones={catalogoTags.map((t) => ({ value: t.nombre, label: t.nombre }))}
              seleccionados={filtroTags}
              onChange={setFiltroTags}
            />

            <FilterMultiSelect
              label="Todos los vendedores"
              opciones={vendedoresAprobados.map((v) => ({ value: v, label: v }))}
              seleccionados={filtroVendedor}
              onChange={setFiltroVendedor}
              buscable
            />

            <FilterMultiSelect
              label="Todas las certificaciones"
              opciones={CERTIFICACIONES.map((c) => ({ value: c.etiqueta, label: c.nombre }))}
              seleccionados={filtroEtiquetas}
              onChange={setFiltroEtiquetas}
            />

            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:text-danger sm:justify-start"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Limpiar filtros
              </button>
            )}

            <span className="text-xs text-muted sm:ml-auto sm:text-right">
              {ordenados.length} de {total} clientes
            </span>
          </div>

          <p className="text-xs text-muted sm:hidden">
            {ordenados.length} de {total} clientes
          </p>
        </div>
      </div>

      {filtrosAbiertos && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setFiltrosAbiertos(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Filtros</p>
              <button
                onClick={() => setFiltrosAbiertos(false)}
                title="Cerrar filtros"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 text-muted"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <button
              onClick={() => setOrden(orden === "recientes" ? "antiguos" : "recientes")}
              className="flex w-full items-center justify-start gap-1.5 truncate rounded-full border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:text-primary"
            >
              {orden === "recientes" ? (
                <ArrowDownWideNarrow className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
              ) : (
                <ArrowUpWideNarrow className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
              )}
              <span className="truncate">
                {orden === "recientes" ? "Más nuevos primero" : "Más antiguos primero"}
              </span>
            </button>

            <FilterMultiSelect
              label="Todos los estados"
              opciones={OPCIONES_ESTADO}
              seleccionados={filtroEstado}
              onChange={setFiltroEstado}
            />

            <select
              value={filtroRegion}
              onChange={(e) => setFiltroRegion(e.target.value)}
              className="w-full rounded-full border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-xs font-medium text-muted outline-none transition-all duration-500 ease-spring focus:border-primary/50"
            >
              <option value={OPCION_TODOS}>Todas las regiones</option>
              {Object.values(REGIONES).map((region) => (
                <option key={region} value={region}>
                  {REGION_LABEL[region as Region]}
                </option>
              ))}
            </select>

            <FilterMultiSelect
              label="Bienvenida WA: todos"
              opciones={OPCIONES_BIENVENIDA}
              seleccionados={filtroBienvenida}
              onChange={setFiltroBienvenida}
            />

            <FilterMultiSelect
              label="Todos los tags"
              opciones={catalogoTags.map((t) => ({ value: t.nombre, label: t.nombre }))}
              seleccionados={filtroTags}
              onChange={setFiltroTags}
            />

            <FilterMultiSelect
              label="Todos los vendedores"
              opciones={vendedoresAprobados.map((v) => ({ value: v, label: v }))}
              seleccionados={filtroVendedor}
              onChange={setFiltroVendedor}
              buscable
            />

            <FilterMultiSelect
              label="Todas las certificaciones"
              opciones={CERTIFICACIONES.map((c) => ({ value: c.etiqueta, label: c.nombre }))}
              seleccionados={filtroEtiquetas}
              onChange={setFiltroEtiquetas}
            />

            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="flex w-full items-center justify-start gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:text-danger"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {seleccionados.size > 0 && (
        <div className="shell rounded-[1.75rem] p-2 diffused-lg">
          <div className="core flex flex-wrap items-center gap-3 rounded-[calc(1.75rem-0.5rem)] p-4">
            <span className="text-xs font-medium text-muted">
              {seleccionados.size} seleccionado{seleccionados.size === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => aplicarAccionEnLote("invitacion")}
              disabled={procesandoLote}
              className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-all duration-500 ease-spring hover:bg-primary/20 disabled:opacity-50"
            >
              {procesandoLote ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              Marcar invitación enviada
            </button>
            <button
              onClick={() => aplicarAccionEnLote("bienvenida")}
              disabled={procesandoLote}
              className="flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-xs font-medium text-success transition-all duration-500 ease-spring hover:bg-success/20 disabled:opacity-50"
            >
              {procesandoLote ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              Marcar MB enviado
            </button>
            <TagPicker seleccionados={[]} onAgregar={aplicarTagsEnLote} />
            {CERTIFICACIONES.map((cert) => (
              <button
                key={cert.id}
                onClick={() => aplicarEtiquetaEnLote(cert.etiqueta)}
                disabled={procesandoLote}
                className="flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2 text-xs font-medium text-warning transition-all duration-500 ease-spring hover:bg-warning/20 disabled:opacity-50"
              >
                {procesandoLote ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                ) : (
                  <Layers className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                Agregar a {cert.nombre}
              </button>
            ))}
            <button
              onClick={() => setSeleccionados(new Set())}
              className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:text-danger"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
              Limpiar selección
            </button>
          </div>
        </div>
      )}

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core rounded-[calc(2rem-0.5rem)] p-2 md:p-3">
          {conEstado.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p className="text-sm text-muted">
                {certificacionActual
                  ? `Ningún cliente está etiquetado con ${certificacionActual.nombre} todavía.`
                  : "Todavía no hay clientes registrados."}
              </p>
              <Link
                href="/clientes/nuevo"
                className="group flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98]"
              >
                <span className="py-2">Registrar el primero</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
              </Link>
            </div>
          ) : ordenados.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted">
              Ningún cliente coincide con la búsqueda o los filtros.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-silver">
              <li className="flex items-center gap-3 px-4 py-2">
                <input
                  type="checkbox"
                  checked={seleccionados.size > 0 && seleccionados.size === ordenados.length}
                  onChange={alternarTodos}
                  className="h-4 w-4 flex-none rounded border-silver-deep/60 accent-primary"
                />
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Seleccionar todos
                </span>
              </li>
              {ordenados.map((cliente) => {
                const dias = diasRestantes(cliente.fechaVencimiento);
                const activo = estaActivo(cliente);
                const pausado = cliente.pausada;
                const invitacionEnviada = cliente.estado !== ESTADOS_CLIENTE.NUEVO;
                return (
                  <li key={cliente.id} className="flex items-center gap-3 px-4">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(cliente.id)}
                      onChange={() => alternarSeleccion(cliente.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 flex-none rounded border-silver-deep/60 accent-primary"
                    />
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="group flex flex-1 flex-wrap items-center justify-between gap-3 rounded-2xl py-4 transition-colors duration-300 hover:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {cliente.nombre}
                          </p>
                          <span
                            className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${
                              pausado
                                ? "bg-warning/10 text-warning"
                                : activo
                                  ? "bg-success/10 text-success"
                                  : "bg-silver text-muted"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                pausado ? "bg-warning" : activo ? "bg-success" : "bg-muted"
                              }`}
                            />
                            {pausado ? "Pausado" : activo ? "Activo" : "Inactivo"}
                          </span>
                          {(cliente.etiquetas ?? []).map((etiqueta) => {
                            const cert = CERTIFICACIONES.find((c) => c.etiqueta === etiqueta);
                            return (
                              <span
                                key={etiqueta}
                                className={`hidden flex-none rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${
                                  cert?.color ?? "bg-silver text-muted"
                                }`}
                              >
                                {cert?.nombre ?? etiqueta}
                              </span>
                            );
                          })}
                        </div>
                        <p className="truncate text-xs text-muted">
                          {cliente.email || "Sin correo"}
                        </p>
                        <p className="hidden truncate text-xs text-muted sm:block">
                          {"Ingreso: "}
                          {aFecha(cliente.fechaLlegada)?.toLocaleDateString("es-MX") ?? "—"}
                          {" · Vence: "}
                          {aFecha(cliente.fechaVencimiento)?.toLocaleDateString("es-MX") ?? "—"}
                          {cliente.region &&
                            ` · ${REGION_LABEL[cliente.region as Region] ?? cliente.region}`}
                        </p>
                        {(cliente.tags ?? []).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(cliente.tags ?? []).map((tag) => {
                              const color =
                                catalogoTags.find((t) => t.nombre === tag)?.color ??
                                "bg-silver text-muted";
                              return (
                                <span
                                  key={tag}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}
                                >
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="hidden flex-none items-center gap-3 sm:flex">
                        {activo && dias !== null && (
                          <span className="hidden text-xs text-muted sm:inline">
                            {dias > 0 ? `${dias} días restantes` : "Vence hoy"}
                          </span>
                        )}
                        <StatusBadge estado={cliente.estadoCalculado} />
                        <InvitacionToggle
                          clienteId={cliente.id}
                          clienteNombre={cliente.nombre}
                          enviada={invitacionEnviada}
                          puedeDeshacer={cliente.estado === ESTADOS_CLIENTE.INVITACION_ENVIADA}
                          compacto
                        />
                        <MensajeBienvenidaToggle
                          clienteId={cliente.id}
                          clienteNombre={cliente.nombre}
                          estado={estadoBienvenidaDe(cliente.mensajeBienvenida)}
                          compacto
                        />
                        <ArrowUpRight
                          className="h-4 w-4 text-muted transition-transform duration-500 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          strokeWidth={1.5}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
