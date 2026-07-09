"use client";

import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import {
  suscribirNotificaciones,
  marcarNotificacionLeida,
  NotificacionDoc,
} from "@/lib/notificacionesService";
import { aFecha } from "@/lib/membership";

// Ventana emergente automática (no requiere abrir la campanita) para avisar
// a los admins de actualizaciones de la plataforma. Se muestra sola al
// entrar mientras haya avisos tipo ACTUALIZACION sin leer.
export function ActualizacionesPopup() {
  const { sesion } = useSesion();
  const [notificaciones, setNotificaciones] = useState<NotificacionDoc[]>([]);

  useEffect(() => {
    if (!sesion || sesion.rol !== "ADMIN") return;
    const unsub = suscribirNotificaciones(sesion, setNotificaciones);
    return () => unsub();
  }, [sesion]);

  if (!sesion || sesion.rol !== "ADMIN") return null;

  const pendientes = notificaciones.filter(
    (n) => n.tipo === "ACTUALIZACION" && !n.leidoPor.includes(sesion.nombre)
  );

  if (pendientes.length === 0) return null;
  const actual = pendientes[0];

  async function cerrar() {
    await marcarNotificacionLeida(actual.id, actual.leidoPor, sesion!.nombre);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in-fast" />
      <div className="animate-fade-in relative flex w-full max-w-md flex-col gap-3 rounded-[2rem] bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
            <Sparkles className="h-3 w-3" strokeWidth={2} />
            Actualización de la plataforma
          </span>
          <button
            onClick={cerrar}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-xl text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm text-foreground">{actual.mensaje}</p>
        {aFecha(actual.fecha) && (
          <p className="text-xs text-muted/70">
            {aFecha(actual.fecha)!.toLocaleDateString("es-MX")}
          </p>
        )}
        <button
          onClick={cerrar}
          className="mt-1 self-end rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98]"
        >
          Entendido{pendientes.length > 1 ? ` (quedan ${pendientes.length - 1})` : ""}
        </button>
      </div>
    </div>
  );
}
