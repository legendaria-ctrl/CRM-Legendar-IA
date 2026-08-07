"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShieldAlert, Sparkles, Send, LoaderCircle } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import {
  crearAvisoActualizacion,
  obtenerPlantillaActualizacion,
  guardarPlantillaActualizacion,
  suscribirAvisosActualizacion,
  NotificacionDoc,
} from "@/lib/notificacionesService";

export default function ActualizacionesPage() {
  const { sesion, cargando } = useSesion();
  const [mensaje, setMensaje] = useState("");
  const [cargandoPlantilla, setCargandoPlantilla] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviadas, setEnviadas] = useState<NotificacionDoc[]>([]);

  useEffect(() => {
    if (sesion?.rol !== "ADMIN") return;
    obtenerPlantillaActualizacion().then((texto) => {
      setMensaje(texto);
      setCargandoPlantilla(false);
    });
    const unsub = suscribirAvisosActualizacion(setEnviadas);
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
          <p className="text-sm text-muted">Solo un administrador puede dar actualizaciones.</p>
        </div>
      </div>
    );
  }

  async function handleGuardar() {
    if (guardando) return;
    setGuardando(true);
    try {
      await guardarPlantillaActualizacion(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEnviar() {
    if (!mensaje.trim() || enviando) return;
    setEnviando(true);
    try {
      await guardarPlantillaActualizacion(mensaje);
      await crearAvisoActualizacion(mensaje, "TODOS");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Comunicación
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Actualizaciones</h1>
        <p className="text-sm text-muted">
          Esta es la plantilla de novedades de la plataforma: edítala con lo nuevo y dale
          &quot;Enviar&quot; para avisarle a todos (vendedores y demás admins) con una ventana
          emergente que no se pueden saltar sin leerla. Se guarda sola, así que la próxima vez
          que haya algo que anunciar solo la ajustas.
        </p>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onBlur={handleGuardar}
            disabled={cargandoPlantilla}
            placeholder="Escribe las novedades de la plataforma…"
            rows={8}
            className="w-full resize-none rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {guardando
                ? "Guardando borrador…"
                : cargandoPlantilla
                  ? "Cargando plantilla…"
                  : "El borrador se guarda automáticamente al salir del cuadro de texto."}
            </p>
            <button
              onClick={handleEnviar}
              disabled={!mensaje.trim() || enviando}
              className="group flex w-fit flex-none items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
            >
              <span className="py-2">Enviar a todos</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
                {enviando ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                ) : (
                  <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.15em] text-muted">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Actualizaciones enviadas
          </h3>

          {enviadas.length === 0 ? (
            <p className="text-sm text-muted">Todavía no se ha enviado ninguna actualización.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-silver">
              {enviadas.map((a) => (
                <li key={a.id} className="flex flex-col gap-1 py-3">
                  <p className="whitespace-pre-wrap text-sm text-muted">{a.mensaje}</p>
                  {a.fecha && (
                    <p className="text-xs text-muted/70">
                      {format(a.fecha.toDate(), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
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
