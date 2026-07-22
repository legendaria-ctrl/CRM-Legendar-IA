"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  suscribirClientes,
  ClienteDoc,
  enviarInvitacion,
  marcarInvitacionEnviada,
  deshacerInvitacion,
  aceptarInvitacion,
  deshacerAceptacion,
  reenviarInvitacionSkool,
  actualizarMensajeBienvenida,
  agregarTagsCliente,
  quitarTagCliente,
  agregarEtiquetasCliente,
  quitarEtiquetaCliente,
} from "@/lib/clientesService";
import { obtenerNotasHistorialPorCliente } from "@/lib/activityService";
import { estadoActual, estaActivo, estadoBienvenidaDe, diasRestantes, aFecha } from "@/lib/membership";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { MensajeBienvenidaToggle } from "@/components/MensajeBienvenidaToggle";
import { InvitacionToggle } from "@/components/InvitacionToggle";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { BulkActionMenu } from "@/components/BulkActionMenu";
import { suscribirTags, TagDoc } from "@/lib/tagsService";
import { suscribirVendedores } from "@/lib/vendedoresService";
import { useSesion } from "@/lib/session-context";
import { useCertificacion } from "@/lib/certificacion-context";
import { useMobileActions } from "@/lib/mobile-actions-context";
import { useFiltrosClientes } from "@/lib/filtros-clientes-context";
import { CERTIFICACIONES, SIN_ASIGNAR_ID } from "@/lib/certificaciones";
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
import type { CambioPendiente, NuevoClientePendiente } from "@/lib/sheetSync";
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
  Layers,
  SlidersHorizontal,
  RefreshCw,
  MessageCircle,
  Tag as TagIcon,
} from "lucide-react";

const OPCION_TODOS = "TODOS";

const OPCIONES_CRITERIOS_BUSQUEDA = [
  { value: "nombre", label: "Nombre" },
  { value: "correo", label: "Correo" },
  { value: "telefono", label: "Teléfono" },
  { value: "notas", label: "Notas" },
  { value: "historial", label: "Historial" },
];

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
  const {
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
  } = useFiltrosClientes();
  const [clientes, setClientes] = useState<ClienteDoc[] | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [procesandoLote, setProcesandoLote] = useState(false);
  const [catalogoTags, setCatalogoTags] = useState<TagDoc[]>([]);
  const [vendedoresAprobados, setVendedoresAprobados] = useState<string[]>([]);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [notasHistorial, setNotasHistorial] = useState<Record<string, string>>({});
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState<string | null>(null);
  const [aceptandoIds, setAceptandoIds] = useState<Set<string>>(new Set());
  const [cambiosPendientes, setCambiosPendientes] = useState<CambioPendiente[]>([]);
  const [seleccionCambios, setSeleccionCambios] = useState<Set<string>>(new Set());
  const [nuevosPendientes, setNuevosPendientes] = useState<NuevoClientePendiente[]>([]);
  const [seleccionNuevos, setSeleccionNuevos] = useState<Set<string>>(new Set());
  const [aplicandoCambios, setAplicandoCambios] = useState(false);
  const { setAcciones } = useMobileActions();

  useEffect(() => {
    const unsub = suscribirClientes(setClientes);
    const unsubTags = suscribirTags(setCatalogoTags);
    const unsubVendedores = suscribirVendedores((lista) => {
      setVendedoresAprobados(
        lista.filter((v) => v.estado === ESTADOS_SOLICITUD.APROBADO).map((v) => v.nombre)
      );
    });
    obtenerNotasHistorialPorCliente().then(setNotasHistorial);
    return () => {
      unsub();
      unsubTags();
      unsubVendedores();
    };
  }, []);

  const clientesDeCertificacion = useMemo(() => {
    const base = (clientes ?? []).filter((c) => !c.eliminado);
    if (!certificacionActual) return base;
    if (certificacionActual.id === SIN_ASIGNAR_ID) {
      return base.filter((c) => (c.etiquetas ?? []).length === 0);
    }
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
          (criteriosBusqueda.includes("nombre") && c.nombre.toLowerCase().includes(texto)) ||
          (criteriosBusqueda.includes("correo") &&
            (c.email ?? "").toLowerCase().includes(texto)) ||
          (criteriosBusqueda.includes("telefono") &&
            (c.telefono ?? "").toLowerCase().includes(texto)) ||
          (criteriosBusqueda.includes("notas") &&
            (c.notas ?? "").toLowerCase().includes(texto)) ||
          (criteriosBusqueda.includes("historial") &&
            (notasHistorial[c.id] ?? "").toLowerCase().includes(texto));
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
    criteriosBusqueda,
    notasHistorial,
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

  async function ejecutarEnLote(accion: (c: (typeof ordenados)[number]) => Promise<void>) {
    if (!sesion || seleccionados.size === 0 || procesandoLote) return;
    setProcesandoLote(true);
    try {
      const objetivos = ordenados.filter((c) => seleccionados.has(c.id));
      await Promise.all(objetivos.map(accion));
      setSeleccionados(new Set());
    } finally {
      setProcesandoLote(false);
    }
  }

  function aplicarEstadoEnLote(
    accion: "enviar" | "marcar_enviada" | "deshacer_invitacion" | "aceptar" | "deshacer_aceptacion"
  ) {
    if (!sesion) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    return ejecutarEnLote((c) => {
      if (accion === "enviar") {
        if (c.estado !== ESTADOS_CLIENTE.NUEVO) return Promise.resolve();
        return enviarInvitacion(c.id, c.nombre, autor, c.email);
      }
      if (accion === "marcar_enviada") {
        if (c.estado !== ESTADOS_CLIENTE.NUEVO) return Promise.resolve();
        return marcarInvitacionEnviada(c.id, c.nombre, autor);
      }
      if (accion === "deshacer_invitacion") {
        if (c.estado !== ESTADOS_CLIENTE.INVITACION_ENVIADA) return Promise.resolve();
        return deshacerInvitacion(c.id, c.nombre, autor);
      }
      if (accion === "aceptar") {
        if (c.estado !== ESTADOS_CLIENTE.INVITACION_ENVIADA) return Promise.resolve();
        return aceptarInvitacion(c.id, c.nombre, autor);
      }
      if (c.estado !== ESTADOS_CLIENTE.ACTIVO) return Promise.resolve();
      return deshacerAceptacion(c.id, c.nombre, autor);
    });
  }

  function reenviarSkoolEnLote() {
    if (!sesion) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    return ejecutarEnLote((c) => {
      if (!c.email) return Promise.resolve();
      return reenviarInvitacionSkool(c.id, c.nombre, autor, c.email).catch(() => {
        // No detener el lote si a uno le falla (ej. correo repetido en Skool).
      });
    });
  }

  function aplicarBienvenidaEnLote(estado: EstadoBienvenida) {
    if (!sesion) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    return ejecutarEnLote((c) => actualizarMensajeBienvenida(c.id, c.nombre, autor, estado));
  }

  function aplicarAgregarTagEnLote(tag: string) {
    if (!sesion) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    return ejecutarEnLote((c) => agregarTagsCliente(c.id, c.nombre, autor, [tag]));
  }

  function aplicarQuitarTagEnLote(tag: string) {
    if (!sesion) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    return ejecutarEnLote((c) => {
      if (!(c.tags ?? []).includes(tag)) return Promise.resolve();
      return quitarTagCliente(c.id, c.nombre, autor, tag);
    });
  }

  function aplicarAgregarEtiquetaEnLote(etiqueta: string) {
    if (!sesion) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    return ejecutarEnLote((c) => agregarEtiquetasCliente(c.id, c.nombre, autor, [etiqueta]));
  }

  function aplicarQuitarEtiquetaEnLote(etiqueta: string) {
    if (!sesion) return;
    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    return ejecutarEnLote((c) => {
      if (!(c.etiquetas ?? []).includes(etiqueta)) return Promise.resolve();
      return quitarEtiquetaCliente(c.id, c.nombre, autor, etiqueta);
    });
  }

  async function aceptarDesdeLista(cliente: ClienteDoc) {
    if (!sesion || aceptandoIds.has(cliente.id)) return;
    setAceptandoIds((prev) => new Set(prev).add(cliente.id));
    try {
      const autor = { nombre: sesion.nombre, rol: sesion.rol };
      await aceptarInvitacion(cliente.id, cliente.nombre, autor);
    } finally {
      setAceptandoIds((prev) => {
        const next = new Set(prev);
        next.delete(cliente.id);
        return next;
      });
    }
  }

  async function actualizarDesdeHoja() {
    if (sincronizando) return;
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const res = await fetch("/api/sync-sheet", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResultadoSync(data.error || "No se pudo actualizar.");
        return;
      }
      const cambios: CambioPendiente[] = data.cambiosPendientes ?? [];
      const nuevos: NuevoClientePendiente[] = data.nuevosPendientes ?? [];
      if (cambios.length > 0 || nuevos.length > 0) {
        setCambiosPendientes(cambios);
        setSeleccionCambios(new Set(cambios.map((c) => c.clienteId)));
        setNuevosPendientes(nuevos);
        setSeleccionNuevos(new Set(nuevos.map((n) => n.correo)));
        return;
      }
      setResultadoSync("Sin cambios, ya estaba todo al día");
    } catch {
      setResultadoSync("No se pudo conectar con la hoja.");
    } finally {
      setSincronizando(false);
    }
  }

  function alternarSeleccionCambio(clienteId: string) {
    setSeleccionCambios((prev) => {
      const next = new Set(prev);
      if (next.has(clienteId)) next.delete(clienteId);
      else next.add(clienteId);
      return next;
    });
  }

  function alternarSeleccionNuevo(correo: string) {
    setSeleccionNuevos((prev) => {
      const next = new Set(prev);
      if (next.has(correo)) next.delete(correo);
      else next.add(correo);
      return next;
    });
  }

  function cerrarRevisionCambios() {
    setCambiosPendientes([]);
    setSeleccionCambios(new Set());
    setNuevosPendientes([]);
    setSeleccionNuevos(new Set());
    setResultadoSync("Sin cambios aplicados");
  }

  async function aplicarCambiosSeleccionados() {
    const total = seleccionCambios.size + seleccionNuevos.size;
    if (aplicandoCambios || total === 0) return;
    setAplicandoCambios(true);
    try {
      const cambios = cambiosPendientes
        .filter((c) => seleccionCambios.has(c.clienteId))
        .map((c) => ({
          clienteId: c.clienteId,
          monto: c.monto?.nuevo,
          vendedor: c.vendedor?.nuevo,
          agregarTagMiembroCS: c.agregarTagMiembroCS,
        }));
      const nuevos = nuevosPendientes.filter((n) => seleccionNuevos.has(n.correo));
      const res = await fetch("/api/sync-sheet/aplicar-cambios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cambios, nuevos }),
      });
      const data = await res.json();
      setCambiosPendientes([]);
      setSeleccionCambios(new Set());
      setNuevosPendientes([]);
      setSeleccionNuevos(new Set());
      if (!res.ok) {
        setResultadoSync(data.error || "No se pudieron aplicar los cambios.");
        return;
      }
      const partes = [];
      if (data.creados > 0) partes.push(`${data.creados} nuevo${data.creados === 1 ? "" : "s"}`);
      if (data.aplicados > 0) {
        partes.push(`${data.aplicados} actualizado${data.aplicados === 1 ? "" : "s"}`);
      }
      setResultadoSync(partes.length > 0 ? partes.join(", ") : "Sin cambios aplicados");
    } catch {
      setResultadoSync("No se pudieron aplicar los cambios.");
    } finally {
      setAplicandoCambios(false);
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

  useEffect(() => {
    setAcciones([
      {
        key: "filtros",
        label: "Filtros",
        icon: SlidersHorizontal,
        onClick: () => setFiltrosAbiertos(true),
        activo: hayFiltrosActivos,
      },
    ]);
    return () => setAcciones([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayFiltrosActivos]);

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
    { label: "Miembros en VIP", value: activos, icon: ShieldCheck },
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

      <div className="grid grid-cols-2 gap-1.5 sm:gap-4 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="shell rounded-xl p-1 diffused sm:rounded-[1.75rem] sm:p-2">
            <div className="core flex flex-row items-center gap-2 rounded-[calc(0.75rem-0.25rem)] p-2 sm:gap-3 sm:rounded-[calc(1.75rem-0.5rem)] sm:p-5">
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9 sm:rounded-xl">
                <Icon className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold tabular-nums text-foreground sm:text-2xl">{value}</p>
                <p className="truncate text-[9px] leading-tight text-muted sm:text-xs">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sm:hidden">
        {sesion?.rol === "ADMIN" && (
          <button
            onClick={actualizarDesdeHoja}
            disabled={sincronizando}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} strokeWidth={1.75} />
            {sincronizando ? "Actualizando…" : "Actualizar desde hoja de ventas"}
          </button>
        )}
        {resultadoSync && (
          <p className="mb-2 text-center text-xs text-muted">{resultadoSync}</p>
        )}
        <button
          onClick={exportarCSV}
          disabled={ordenados.length === 0}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-40"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Descargar CSV
        </button>

        <div className="flex items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 transition-all duration-500 ease-spring focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
          <Search className="h-4 w-4 text-muted" strokeWidth={1.5} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
          />
        </div>
        <div className="mt-2">
          <FilterMultiSelect
            label="Buscar en: todo"
            opciones={OPCIONES_CRITERIOS_BUSQUEDA}
            seleccionados={criteriosBusqueda}
            onChange={setCriteriosBusqueda}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {ordenados.length} de {total} clientes
        </p>
      </div>

      <div className="hidden sm:block shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 transition-all duration-500 ease-spring focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
              <Search className="h-4 w-4 text-muted" strokeWidth={1.5} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
              />
            </div>

            <FilterMultiSelect
              label="Buscar en: todo"
              opciones={OPCIONES_CRITERIOS_BUSQUEDA}
              seleccionados={criteriosBusqueda}
              onChange={setCriteriosBusqueda}
            />

            {sesion?.rol === "ADMIN" && (
              <button
                onClick={actualizarDesdeHoja}
                disabled={sincronizando}
                title={resultadoSync ?? undefined}
                className="flex items-center justify-center gap-2 rounded-full border border-silver-deep/60 bg-surface-2 px-5 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-primary disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} strokeWidth={1.75} />
                <span>{sincronizando ? "Actualizando…" : resultadoSync ?? "Actualizar"}</span>
              </button>
            )}

            <button
              onClick={exportarCSV}
              disabled={ordenados.length === 0}
              className="flex items-center justify-center gap-2 rounded-full border border-silver-deep/60 bg-surface-2 px-5 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-primary disabled:opacity-40"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              <span>Descargar CSV</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      {filtrosAbiertos && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in-fast"
            onClick={() => setFiltrosAbiertos(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-surface p-4 shadow-2xl animate-fade-in">
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
        <div className="shell animate-fade-in rounded-[1.75rem] p-2 diffused-lg">
          <div className="core flex flex-wrap items-center gap-3 rounded-[calc(1.75rem-0.5rem)] p-4">
            <span className="text-xs font-medium text-muted">
              {seleccionados.size} seleccionado{seleccionados.size === 1 ? "" : "s"}
            </span>
            <BulkActionMenu
              label="Estado"
              icon={RefreshCw}
              disabled={procesandoLote}
              options={[
                {
                  key: "enviar",
                  label: "Enviar invitación",
                  onSelect: () => aplicarEstadoEnLote("enviar"),
                },
                {
                  key: "marcar_enviada",
                  label: "Marcar invitación enviada",
                  onSelect: () => aplicarEstadoEnLote("marcar_enviada"),
                },
                {
                  key: "deshacer_invitacion",
                  label: "Deshacer invitación (vuelve a Nuevo)",
                  onSelect: () => aplicarEstadoEnLote("deshacer_invitacion"),
                  quitar: true,
                },
                {
                  key: "aceptar",
                  label: "Marcar invitación aceptada",
                  onSelect: () => aplicarEstadoEnLote("aceptar"),
                },
                {
                  key: "deshacer_aceptacion",
                  label: "Deshacer aceptación",
                  onSelect: () => aplicarEstadoEnLote("deshacer_aceptacion"),
                  quitar: true,
                },
                {
                  key: "reenviar_skool",
                  label: "Reenviar invitación a Skool",
                  onSelect: () => reenviarSkoolEnLote(),
                },
              ]}
            />

            <BulkActionMenu
              label="Bienvenida WA"
              icon={MessageCircle}
              disabled={procesandoLote}
              options={Object.values(ESTADOS_BIENVENIDA).map((estado) => ({
                key: estado,
                label: BIENVENIDA_LABEL[estado as EstadoBienvenida],
                onSelect: () => aplicarBienvenidaEnLote(estado as EstadoBienvenida),
              }))}
            />

            <BulkActionMenu
              label="Tags"
              icon={TagIcon}
              disabled={procesandoLote}
              options={catalogoTags.flatMap((t) => [
                {
                  key: `add-${t.nombre}`,
                  label: `Agregar: ${t.nombre}`,
                  onSelect: () => aplicarAgregarTagEnLote(t.nombre),
                },
                {
                  key: `quitar-${t.nombre}`,
                  label: `Quitar: ${t.nombre}`,
                  onSelect: () => aplicarQuitarTagEnLote(t.nombre),
                  quitar: true,
                },
              ])}
            />

            <BulkActionMenu
              label="Certificación"
              icon={Layers}
              disabled={procesandoLote}
              options={CERTIFICACIONES.flatMap((cert) => [
                {
                  key: `add-${cert.id}`,
                  label: `Agregar a ${cert.nombre}`,
                  onSelect: () => aplicarAgregarEtiquetaEnLote(cert.etiqueta),
                },
                {
                  key: `quitar-${cert.id}`,
                  label: `Quitar de ${cert.nombre}`,
                  onSelect: () => aplicarQuitarEtiquetaEnLote(cert.etiqueta),
                  quitar: true,
                },
              ])}
            />

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
                        <div className="flex items-center gap-1">
                          <p className="truncate text-xs text-muted">
                            {cliente.email || "Sin correo"}
                          </p>
                          {cliente.email && <CopyButton valor={cliente.email} />}
                        </div>
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
                      <div className="flex flex-none items-center gap-2 sm:gap-3">
                        <span
                          className={`inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:hidden ${
                            activo ? "bg-success/10 text-success" : "bg-silver text-muted"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-success" : "bg-muted"}`}
                          />
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                        <div className="hidden flex-none items-center sm:flex">
                          <StatusBadge
                            estado={cliente.estadoCalculado}
                            onClick={
                              cliente.estadoCalculado === ESTADOS_CLIENTE.INVITACION_ENVIADA
                                ? () => aceptarDesdeLista(cliente)
                                : undefined
                            }
                            cargando={aceptandoIds.has(cliente.id)}
                            title={
                              cliente.estadoCalculado === ESTADOS_CLIENTE.INVITACION_ENVIADA
                                ? "Marcar invitación como aceptada"
                                : undefined
                            }
                          />
                        </div>
                        <div className="hidden flex-none items-center gap-3 sm:flex">
                          {activo && dias !== null && (
                            <span className="hidden text-xs text-muted sm:inline">
                              {dias > 0 ? `${dias} días restantes` : "Vence hoy"}
                            </span>
                          )}
                          <InvitacionToggle
                            clienteId={cliente.id}
                            clienteNombre={cliente.nombre}
                            clienteCorreo={cliente.email}
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
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {(cambiosPendientes.length > 0 || nuevosPendientes.length > 0) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="shell w-full max-w-lg rounded-[2rem] p-2 diffused-lg">
            <div className="core flex max-h-[85vh] flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Cambios detectados en la hoja de ventas
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Revisa y confirma qué agregar y qué actualizar.
                  </p>
                </div>
                <button
                  onClick={cerrarRevisionCambios}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 text-muted"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto">
                {nuevosPendientes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Clientes nuevos que se agregarán ({nuevosPendientes.length})
                    </p>
                    {nuevosPendientes.map((nuevo) => (
                      <label
                        key={nuevo.correo}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={seleccionNuevos.has(nuevo.correo)}
                          onChange={() => alternarSeleccionNuevo(nuevo.correo)}
                          className="mt-0.5 h-4 w-4 flex-none rounded border-silver-deep/60 accent-primary"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {nuevo.nombre}
                          </p>
                          <p className="truncate text-xs text-muted">{nuevo.correo}</p>
                          <div className="mt-1 flex flex-col gap-0.5 text-xs text-foreground">
                            <span>
                              Región: <span className="font-medium">{nuevo.region}</span>
                              {nuevo.vendedor && (
                                <>
                                  {" · Vendedor: "}
                                  <span className="font-medium">{nuevo.vendedor}</span>
                                </>
                              )}
                              {nuevo.monto && (
                                <>
                                  {" · Monto: "}
                                  <span className="font-medium text-success">{nuevo.monto}</span>
                                </>
                              )}
                            </span>
                            {nuevo.tags.length > 0 && (
                              <span>
                                Tag: <span className="font-medium text-success">{nuevo.tags.join(", ")}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {cambiosPendientes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Cambios en clientes existentes ({cambiosPendientes.length})
                    </p>
                    {cambiosPendientes.map((cambio) => (
                      <label
                        key={cambio.clienteId}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={seleccionCambios.has(cambio.clienteId)}
                          onChange={() => alternarSeleccionCambio(cambio.clienteId)}
                          className="mt-0.5 h-4 w-4 flex-none rounded border-silver-deep/60 accent-primary"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {cambio.nombre}
                          </p>
                          <p className="truncate text-xs text-muted">{cambio.correo}</p>
                          <div className="mt-1 flex flex-col gap-0.5 text-xs text-foreground">
                            {cambio.monto && (
                              <span>
                                Monto: <span className="text-muted">{cambio.monto.actual ?? "—"}</span>
                                {" → "}
                                <span className="font-medium text-success">{cambio.monto.nuevo}</span>
                              </span>
                            )}
                            {cambio.vendedor && (
                              <span>
                                Vendedor:{" "}
                                <span className="text-muted">{cambio.vendedor.actual ?? "—"}</span>
                                {" → "}
                                <span className="font-medium text-success">{cambio.vendedor.nuevo}</span>
                              </span>
                            )}
                            {cambio.agregarTagMiembroCS && (
                              <span>
                                Agregar tag: <span className="font-medium text-success">Miembro del CS</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={cerrarRevisionCambios}
                  className="rounded-full border border-silver-deep/60 bg-surface-2 px-5 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-foreground"
                >
                  Descartar
                </button>
                <button
                  onClick={aplicarCambiosSeleccionados}
                  disabled={aplicandoCambios || seleccionCambios.size + seleccionNuevos.size === 0}
                  className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
                >
                  {aplicandoCambios ? (
                    <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  ) : null}
                  {aplicandoCambios
                    ? "Aplicando…"
                    : `Aplicar seleccionados (${seleccionCambios.size + seleccionNuevos.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
