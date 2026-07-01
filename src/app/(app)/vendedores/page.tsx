"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X, ShieldAlert, Clock, UserCheck, UserX } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import { suscribirVendedores, decidirSolicitud, VendedorDoc } from "@/lib/vendedoresService";
import { ESTADOS_SOLICITUD } from "@/lib/constants";

export default function VendedoresPage() {
  const { sesion, cargando } = useSesion();
  const [vendedores, setVendedores] = useState<VendedorDoc[] | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

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

  const pendientes = (vendedores ?? []).filter((v) => v.estado === ESTADOS_SOLICITUD.PENDIENTE);
  const decididos = (vendedores ?? []).filter((v) => v.estado !== ESTADOS_SOLICITUD.PENDIENTE);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Acceso
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vendedores</h1>
        <p className="text-sm text-muted">
          Aprueba a un vendedor la primera vez que intenta entrar. Después de aprobado, debe usar
          siempre el mismo nombre.
        </p>
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
              {pendientes.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.nombre}</p>
                    <p className="text-xs text-muted">
                      {v.creadoEn
                        ? `Solicitó acceso el ${format(v.creadoEn.toDate(), "d MMM yyyy, HH:mm", { locale: es })}`
                        : "Solicitando…"}
                    </p>
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
              ))}
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
                      <p className="text-sm font-medium text-foreground">{v.nombre}</p>
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
                      className="rounded-full bg-success/10 px-4 py-1.5 text-xs font-medium text-success transition-all duration-500 ease-spring hover:bg-success/20"
                    >
                      Aprobar ahora
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
