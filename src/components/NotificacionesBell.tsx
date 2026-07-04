"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import {
  suscribirNotificaciones,
  marcarNotificacionLeida,
  NotificacionDoc,
} from "@/lib/notificacionesService";
import { aFecha } from "@/lib/membership";

export function NotificacionesBell() {
  const { sesion } = useSesion();
  const [notificaciones, setNotificaciones] = useState<NotificacionDoc[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!sesion) return;
    const unsub = suscribirNotificaciones(sesion, setNotificaciones);
    return () => unsub();
  }, [sesion]);

  if (!sesion) return null;

  const noLeidas = notificaciones.filter((n) => !n.leidoPor.includes(sesion.nombre));

  function alAbrir() {
    setAbierto((v) => !v);
  }

  async function marcarLeida(n: NotificacionDoc) {
    if (!sesion) return;
    await marcarNotificacionLeida(n.id, n.leidoPor, sesion.nombre);
  }

  return (
    <div className="relative">
      <button
        onClick={alAbrir}
        title="Notificaciones"
        className="relative flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl border border-silver-deep/60 bg-surface-2 text-muted transition-all duration-500 ease-spring active:scale-[0.98] md:h-11 md:w-11"
      >
        <Bell className="h-5 w-5 md:h-4 md:w-4" strokeWidth={1.75} />
        {noLeidas.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
            {noLeidas.length > 9 ? "9+" : noLeidas.length}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-[60px] z-50 flex max-h-[70vh] w-80 max-w-[85vw] flex-col gap-2 overflow-y-auto rounded-[1.5rem] border border-silver-deep/60 bg-surface p-3 shadow-2xl">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-medium text-foreground">Notificaciones</p>
              <button
                onClick={() => setAbierto(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            {notificaciones.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted">No tienes notificaciones.</p>
            ) : (
              notificaciones.map((n) => {
                const leida = n.leidoPor.includes(sesion.nombre);
                const fecha = aFecha(n.fecha);
                const contenido = (
                  <div
                    className={`flex flex-col gap-1 rounded-2xl px-3 py-2.5 text-left transition-colors duration-300 ${
                      leida ? "bg-transparent" : "bg-primary-dim"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">
                        {n.tipo === "AVISO" ? `Aviso de ${n.autor}` : "Actividad de vendedor"}
                      </p>
                      {!leida && <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted">{n.mensaje}</p>
                    {fecha && (
                      <p className="text-[10px] text-muted/70">
                        {fecha.toLocaleDateString("es-MX")} {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                );

                return n.clienteId ? (
                  <Link
                    key={n.id}
                    href={`/clientes/${n.clienteId}`}
                    onClick={() => {
                      marcarLeida(n);
                      setAbierto(false);
                    }}
                    className="hover:bg-surface-2 rounded-2xl"
                  >
                    {contenido}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => marcarLeida(n)} className="hover:bg-surface-2 rounded-2xl">
                    {contenido}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
