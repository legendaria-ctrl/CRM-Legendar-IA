"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  DollarSign,
  ArrowUpRight,
  Hourglass,
  RefreshCw,
  LoaderCircle,
  Wallet,
  Search,
} from "lucide-react";
import { suscribirClientes, ClienteDoc } from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";
import { ESTADOS_CLIENTE, ROLES, EstadoCliente } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";

type FiltroTipo = "todos" | "apartados" | "seguimientos";

const FILTRO_OPCIONES: { value: FiltroTipo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "apartados", label: "Apartados" },
  { value: "seguimientos", label: "Seguimientos" },
];

function restanteDe(cliente: ClienteDoc): number | null {
  const total = Number(cliente.monto);
  if (!cliente.monto || Number.isNaN(total)) return null;
  return total - (cliente.totalAbonado ?? 0);
}

export default function SeguimientosPage() {
  const { sesion } = useSesion();
  const [clientes, setClientes] = useState<ClienteDoc[] | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [actualizando, setActualizando] = useState(false);
  const [resultadoActualizar, setResultadoActualizar] = useState<string | null>(null);

  useEffect(() => {
    const unsub = suscribirClientes(setClientes);
    return () => unsub();
  }, []);

  async function actualizarDesdeHoja() {
    if (actualizando) return;
    setActualizando(true);
    setResultadoActualizar(null);
    try {
      const res = await fetch("/api/sync-seguimientos", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResultadoActualizar(data.error || "No se pudo actualizar.");
        return;
      }
      setResultadoActualizar(
        data.creados || data.actualizados
          ? `${data.creados} nuevo(s), ${data.actualizados} reasignado(s)`
          : "Sin cambios, ya estaba todo al día"
      );
    } catch {
      setResultadoActualizar("No se pudo conectar con la hoja.");
    } finally {
      setActualizando(false);
    }
  }

  const propios = useMemo(() => {
    if (!clientes || !sesion) return [];
    if (sesion.rol === ROLES.ADMIN) return clientes;
    return clientes.filter(
      (c) => c.creadoPor === sesion.nombre || c.vendedor === sesion.nombre
    );
  }, [clientes, sesion]);

  const coincideBusqueda = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (c: ClienteDoc) =>
      !texto ||
      c.nombre.toLowerCase().includes(texto) ||
      (c.email ?? "").toLowerCase().includes(texto) ||
      (c.telefono ?? "").toLowerCase().includes(texto);
  }, [busqueda]);

  const enSeguimiento = useMemo(() => {
    const lista = propios.filter(
      (c) => c.estado === ESTADOS_CLIENTE.SEGUIMIENTO && coincideBusqueda(c)
    );
    const filtrada = lista.filter((c) => {
      const esApartado = (c.totalAbonado ?? 0) > 0;
      if (filtroTipo === "apartados") return esApartado;
      if (filtroTipo === "seguimientos") return !esApartado;
      return true;
    });
    return [...filtrada].sort((a, b) => {
      const apartadoA = (a.totalAbonado ?? 0) > 0 ? 1 : 0;
      const apartadoB = (b.totalAbonado ?? 0) > 0 ? 1 : 0;
      return apartadoB - apartadoA;
    });
  }, [propios, filtroTipo, coincideBusqueda]);

  const enRevision = useMemo(
    () =>
      propios.filter(
        (c) => c.estado === ESTADOS_CLIENTE.PENDIENTE_AUTORIZACION && coincideBusqueda(c)
      ),
    [propios, coincideBusqueda]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Seguimientos</h1>
          <p className="text-sm text-muted">
            Lleva tus apartados hasta que terminen de pagar y envíalos a autorización.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={actualizarDesdeHoja}
            disabled={actualizando}
            className="flex items-center gap-1.5 rounded-full border border-silver-deep/60 px-4 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            {actualizando ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            )}
            Actualizar
          </button>
          <Link
            href="/seguimientos/nuevo"
            className="group flex w-fit items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98]"
          >
            <span className="py-2">Nuevo seguimiento</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
              <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          </Link>
        </div>
      </div>

      {resultadoActualizar && (
        <p className="text-sm text-muted">{resultadoActualizar}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-1 w-fit">
          {FILTRO_OPCIONES.map((op) => (
            <button
              key={op.value}
              onClick={() => setFiltroTipo(op.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-500 ease-spring ${
                filtroTipo === op.value
                  ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                  : "text-muted"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 sm:w-72">
          <Search className="h-4 w-4 flex-none text-muted" strokeWidth={1.75} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
          />
        </label>
      </div>

      {clientes === null && (
        <p className="py-10 text-center text-sm text-muted">Cargando seguimientos…</p>
      )}

      {clientes !== null && (
        <>
          <Seccion titulo="En seguimiento" vacio="No tienes apartados activos por ahora.">
            {enSeguimiento.map((c) => (
              <FilaSeguimiento key={c.id} cliente={c} />
            ))}
          </Seccion>

          <Seccion
            titulo="Enviados a revisión"
            vacio="No tienes seguimientos esperando autorización."
          >
            {enRevision.map((c) => (
              <FilaSeguimiento key={c.id} cliente={c} soloLectura />
            ))}
          </Seccion>
        </>
      )}
    </div>
  );
}

function Seccion({
  titulo,
  vacio,
  children,
}: {
  titulo: string;
  vacio: string;
  children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const hayContenido = arr.some(Boolean) && arr.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-muted">{titulo}</h2>
      {hayContenido ? (
        <div className="flex flex-col gap-3">{children}</div>
      ) : (
        <p className="rounded-2xl border border-dashed border-silver-deep/60 px-4 py-6 text-center text-sm text-muted">
          {vacio}
        </p>
      )}
    </div>
  );
}

function FilaSeguimiento({
  cliente,
  soloLectura = false,
}: {
  cliente: ClienteDoc;
  soloLectura?: boolean;
}) {
  const restante = restanteDe(cliente);
  const esApartado = (cliente.totalAbonado ?? 0) > 0;

  return (
    <Link
      href={`/clientes/${cliente.id}`}
      className="shell rounded-[1.75rem] p-2 diffused transition-transform duration-500 ease-spring hover:scale-[1.005]"
    >
      <div className="core flex flex-wrap items-center justify-between gap-3 rounded-[calc(1.75rem-0.5rem)] p-5">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <StatusBadge estado={cliente.estado as EstadoCliente} />
            {esApartado && !soloLectura && (
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                <Wallet className="h-3 w-3" strokeWidth={2} />
                Apartado
              </span>
            )}
            {soloLectura && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-muted">
                <Hourglass className="h-3 w-3" strokeWidth={2} />
                En revisión, bloqueado
              </span>
            )}
          </div>
          <p className="truncate text-sm font-medium text-foreground">{cliente.nombre}</p>
          {cliente.vendedor && (
            <p className="truncate text-xs text-muted">Vendedor: {cliente.vendedor}</p>
          )}
        </div>

        <div className="flex flex-none items-center gap-4">
          {cliente.monto && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="flex items-center gap-1 text-xs text-muted">
                <DollarSign className="h-3 w-3" strokeWidth={1.5} />
                Total {cliente.monto}
              </span>
              {restante !== null && (
                <span className="text-xs font-medium text-success">
                  {restante > 0 ? `Restan $${restante.toLocaleString("es-MX")}` : "Liquidado"}
                </span>
              )}
            </div>
          )}
          <ArrowUpRight className="h-4 w-4 text-muted" strokeWidth={1.75} />
        </div>
      </div>
    </Link>
  );
}
