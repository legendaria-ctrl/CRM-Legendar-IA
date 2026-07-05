"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check,
  X,
  ShieldAlert,
  Clock,
  UserCheck,
  UserX,
  TriangleAlert,
  UserPlus,
  LoaderCircle,
} from "lucide-react";
import { useSesion } from "@/lib/session-context";
import {
  suscribirVendedores,
  decidirSolicitud,
  crearVendedorAprobado,
  normalizarNombre,
  VendedorDoc,
} from "@/lib/vendedoresService";
import { ESTADOS_SOLICITUD, ROLES, Rol } from "@/lib/constants";
import { nombresParecidos } from "@/lib/similitud";

export default function VendedoresPage() {
  const { sesion, cargando } = useSesion();
  const [vendedores, setVendedores] = useState<VendedorDoc[] | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [rolNuevo, setRolNuevo] = useState<Rol>(ROLES.VENDEDOR);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  useEffect(() => {
    if (sesion?.rol !== "ADMIN") return;
    const unsub = suscribirVendedores(setVendedores);
    return () => unsub();
  }, [sesion?.rol]);

  if (cargando) {
    return <div className="py-16 text-center text-sm text-muted">Cargando…</div>;
  }

  if (sesion?.rol !== "ADMIN") {
    return (
      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col items-center gap-3 rounded-[calc(2rem-0.5rem)] p-16 text-center">
          <ShieldAlert className="h-6 w-6 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-muted">
            Solo un administrador puede ver y aprobar vendedores.
          </p>
        </div>
      </div>
    );
  }

  async function decidir(id: string, estado: "APROBADO" | "RECHAZADO") {
    if (!sesion) return;
    setProcesando(id);
    try {
      await decidirSolicitud(id, estado, sesion.nombre);
    } finally {
      setProcesando(null);
    }
  }

  async function handleCrear() {
    if (!sesion || !nombreNuevo.trim() || creando) return;
    setCreando(true);
    setErrorCrear(null);
    try {
      await crearVendedorAprobado(nombreNuevo, sesion.nombre, rolNuevo);
      setNombreNuevo("");
    } catch (err) {
      setErrorCrear(err instanceof Error ? err.message : "No se pudo agregar a la persona.");
    } finally {
      setCreando(false);
    }
  }

  function revocar(v: VendedorDoc) {
    const confirmado = window.confirm(
      `¿Revocar el acceso de "${v.nombre}"? No podrá entrar hasta que lo vuelvas a aprobar.`
    );
    if (confirmado) decidir(v.id, "RECHAZADO");
  }

  const pendientes = (vendedores ?? []).filter((v) => v.estado === ESTADOS_SOLICITUD.PENDIENTE);
  const decididos = (vendedores ?? []).filter((v) => v.estado !== ESTADOS_SOLICITUD.PENDIENTE);
  const aprobados = (vendedores ?? []).filter((v) => v.estado === ESTADOS_SOLICITUD.APROBADO);

  function posibleDuplicado(pendiente: VendedorDoc): VendedorDoc | undefined {
    const normalizado = normalizarNombre(pendiente.nombre);
    return aprobados.find(
      (ap) =>
        ap.id !== pendiente.id &&
        ap.rol === pendiente.rol &&
        nombresParecidos(normalizado, normalizarNombre(ap.nombre))
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Acceso
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vendedores</h1>
        <p className="text-sm text-muted">
          Aprueba a un vendedor la primera vez que intenta entrar, o agrégalo tú directamente ya
          aprobado. Después de aprobado, debe usar siempre el mismo nombre.
        </p>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.15em] text-muted">
            <UserPlus className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Agregar persona
          </h3>
          <p className="text-xs text-muted">
            Se agrega ya aprobada. Dale este nombre exacto junto con la clave de acceso
            compartida de su rol para que pueda entrar.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1 sm:w-64">
            <button
              type="button"
              onClick={() => setRolNuevo(ROLES.VENDEDOR)}
              className={`rounded-xl py-2 text-sm font-medium transition-all duration-500 ease-spring ${
                rolNuevo === ROLES.VENDEDOR
                  ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                  : "text-muted"
              }`}
            >
              Vendedor
            </button>
            <button
              type="button"
              onClick={() => setRolNuevo(ROLES.ADMIN)}
              className={`rounded-xl py-2 text-sm font-medium transition-all duration-500 ease-spring ${
                rolNuevo === ROLES.ADMIN
                  ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                  : "text-muted"
              }`}
            >
              Admin
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCrear()}
              placeholder={rolNuevo === ROLES.ADMIN ? "Nombre del admin" : "Nombre del vendedor"}
              className="min-w-0 flex-1 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
            <button
              onClick={handleCrear}
              disabled={!nombreNuevo.trim() || creando}
              className="group flex items-center justify-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
            >
              <span className="py-2">Agregar</span>
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
                {creando ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </span>
            </button>
          </div>
          {errorCrear && <p className="text-sm text-danger">{errorCrear}</p>}
        </div>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.15em] text-muted">
            <Clock className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Pendientes de aprobación {pendientes.length > 0 && `(${pendientes.length})`}
          </h3>

          {vendedores === null ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : pendientes.length === 0 ? (
            <p className="text-sm text-muted">No hay solicitudes pendientes.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendientes.map((v) => {
                const duplicado = posibleDuplicado(v);
                return (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{v.nombre}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                          v.rol === ROLES.ADMIN
                            ? "bg-primary/10 text-primary"
                            : "bg-silver text-muted"
                        }`}
                      >
                        {v.rol === ROLES.ADMIN ? "Admin" : "Vendedor"}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {v.creadoEn
                        ? `Solicitó acceso el ${format(v.creadoEn.toDate(), "d MMM yyyy, HH:mm", { locale: es })}`
                        : "Solicitando…"}
                    </p>
                    {duplicado && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-warning">
                        <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2} />
                        Posible duplicado de &quot;{duplicado.nombre}&quot; (ya aprobado) — verifica antes de aprobar
                      </p>
                    )}
                  </div>
                  <div className="flex flex-none gap-2">
                    <button
                      onClick={() => decidir(v.id, "APROBADO")}
                      disabled={procesando === v.id}
                      className="flex items-center gap-1.5 rounded-full bg-success/10 px-4 py-2 text-xs font-medium text-success transition-all duration-500 ease-spring hover:bg-success/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      Aprobar
                    </button>
                    <button
                      onClick={() => decidir(v.id, "RECHAZADO")}
                      disabled={procesando === v.id}
                      className="flex items-center gap-1.5 rounded-full bg-danger/10 px-4 py-2 text-xs font-medium text-danger transition-all duration-500 ease-spring hover:bg-danger/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                      Rechazar
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-muted">
            Historial
          </h3>

          {decididos.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay decisiones registradas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-silver">
              {decididos.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2">
                    {v.estado === ESTADOS_SOLICITUD.APROBADO ? (
                      <UserCheck className="h-4 w-4 text-success" strokeWidth={1.5} />
                    ) : (
                      <UserX className="h-4 w-4 text-danger" strokeWidth={1.5} />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{v.nombre}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                            v.rol === ROLES.ADMIN
                              ? "bg-primary/10 text-primary"
                              : "bg-silver text-muted"
                          }`}
                        >
                          {v.rol === ROLES.ADMIN ? "Admin" : "Vendedor"}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {v.estado === ESTADOS_SOLICITUD.APROBADO ? "Aprobado" : "Rechazado"} por{" "}
                        {v.decididoPor ?? "—"}
                        {v.decididoEn &&
                          ` · ${format(v.decididoEn.toDate(), "d MMM yyyy, HH:mm", { locale: es })}`}
                      </p>
                    </div>
                  </div>
                  {v.estado === ESTADOS_SOLICITUD.RECHAZADO && (
                    <button
                      onClick={() => decidir(v.id, "APROBADO")}
                      disabled={procesando === v.id}
                      className="rounded-full bg-success/10 px-4 py-1.5 text-xs font-medium text-success transition-all duration-500 ease-spring hover:bg-success/20 disabled:opacity-50"
                    >
                      Aprobar ahora
                    </button>
                  )}
                  {v.estado === ESTADOS_SOLICITUD.APROBADO && (
                    <button
                      onClick={() => revocar(v)}
                      disabled={procesando === v.id}
                      className="rounded-full bg-danger/10 px-4 py-1.5 text-xs font-medium text-danger transition-all duration-500 ease-spring hover:bg-danger/20 disabled:opacity-50"
                    >
                      Revocar acceso
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
