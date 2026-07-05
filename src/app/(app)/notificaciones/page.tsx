"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ArrowUpRight } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import {
  suscribirNotificaciones,
  marcarNotificacionLeida,
  NotificacionDoc,
} from "@/lib/notificacionesService";
import { aFecha } from "@/lib/membership";

export default function NotificacionesPage() {
  const { sesion, cargando } = useSesion();
  const [notificaciones, setNotificaciones] = useState<NotificacionDoc[] | null>(null);

  useEffect(() => {
    if (!sesion) return;
    const unsub = suscribirNotificaciones(sesion, setNotificaciones);
    return () => unsub();
  }, [sesion]);

  if (cargando || !sesion) {
    return <div className="py-16 text-center text-sm text-muted">Cargando…</div>;
  }

  async function marcarLeida(n: NotificacionDoc) {
    if (!sesion) return;
    await marcarNotificacionLeida(n.id, n.leidoPor, sesion.nombre);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Comunicación
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Avisos</h1>
        <p className="text-sm text-muted">
          Aquí quedan guardados todos los avisos que has recibido, para releerlos cuando quieras.
        </p>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core rounded-[calc(2rem-0.5rem)] p-2 md:p-3">
          {notificaciones === null ? (
            <p className="px-6 py-16 text-center text-sm text-muted">Cargando…</p>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Bell className="h-6 w-6 text-muted" strokeWidth={1.5} />
              <p className="text-sm text-muted">Todavía no tienes ningún aviso.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-silver">
              {notificaciones.map((n) => {
                const leida = n.leidoPor.includes(sesion.nombre);
                const fecha = aFecha(n.fecha);
                const contenido = (
                  <div
                    className={`flex flex-col gap-1 rounded-2xl px-4 py-4 transition-colors duration-300 ${
                      leida ? "bg-transparent" : "bg-primary-dim"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {n.tipo === "AVISO" ? `Aviso de ${n.autor}` : "Actividad de vendedor"}
                      </p>
                      {!leida && (
                        <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted">{n.mensaje}</p>
                    {fecha && (
                      <p className="text-xs text-muted/70">
                        {fecha.toLocaleDateString("es-MX")}{" "}
                        {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                );

                return n.clienteId ? (
                  <li key={n.id}>
                    <Link
                      href={`/clientes/${n.clienteId}`}
                      onClick={() => marcarLeida(n)}
                      className="group flex items-center justify-between gap-2 rounded-2xl transition-colors duration-300 hover:bg-surface-2"
                    >
                      <div className="flex-1">{contenido}</div>
                      <ArrowUpRight
                        className="mr-4 h-4 w-4 flex-none text-muted transition-transform duration-500 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        strokeWidth={1.5}
                      />
                    </Link>
                  </li>
                ) : (
                  <li key={n.id}>
                    <button
                      onClick={() => marcarLeida(n)}
                      className="w-full rounded-2xl text-left transition-colors duration-300 hover:bg-surface-2"
                    >
                      {contenido}
                    </button>
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
