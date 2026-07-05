"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShieldAlert, Megaphone, Send, LoaderCircle, Users, UserRound } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import { suscribirVendedores, VendedorDoc } from "@/lib/vendedoresService";
import { ESTADOS_SOLICITUD, ROLES } from "@/lib/constants";
import {
  crearAviso,
  suscribirAvisosEnviados,
  NotificacionDoc,
} from "@/lib/notificacionesService";

export default function AvisosPage() {
  const { sesion, cargando } = useSesion();
  const [vendedores, setVendedores] = useState<VendedorDoc[] | null>(null);
  const [avisos, setAvisos] = useState<NotificacionDoc[]>([]);
  const [audiencia, setAudiencia] = useState<"TODOS" | "PRIVADO">("TODOS");
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (sesion?.rol !== "ADMIN") return;
    const unsubVendedores = suscribirVendedores(setVendedores);
    const unsubAvisos = suscribirAvisosEnviados(setAvisos);
    return () => {
      unsubVendedores();
      unsubAvisos();
    };
  }, [sesion?.rol]);

  const personas = useMemo(
    () =>
      (vendedores ?? [])
        .filter((v) => v.estado === ESTADOS_SOLICITUD.APROBADO && v.nombre !== sesion?.nombre)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [vendedores, sesion?.nombre]
  );

  if (cargando) {
    return <div className="py-16 text-center text-sm text-muted">Cargando…</div>;
  }

  if (sesion?.rol !== "ADMIN") {
    return (
      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col items-center gap-3 rounded-[calc(2rem-0.5rem)] p-16 text-center">
          <ShieldAlert className="h-6 w-6 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-muted">Solo un administrador puede dar avisos.</p>
        </div>
      </div>
    );
  }

  function alternarDestinatario(nombre: string) {
    setDestinatarios((prev) =>
      prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre]
    );
  }

  async function handleEnviar() {
    if (!sesion || !mensaje.trim() || enviando) return;
    if (audiencia === "PRIVADO" && destinatarios.length === 0) return;
    setEnviando(true);
    try {
      await crearAviso(
        { nombre: sesion.nombre, rol: sesion.rol },
        audiencia,
        destinatarios,
        mensaje
      );
      setMensaje("");
      setDestinatarios([]);
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dar avisos</h1>
        <p className="text-sm text-muted">
          Envía un aviso general a todos (vendedores y demás admins) o uno privado a personas
          específicas.
        </p>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1 sm:w-72">
            <button
              type="button"
              onClick={() => setAudiencia("TODOS")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
                audiencia === "TODOS"
                  ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                  : "text-muted"
              }`}
            >
              <Users className="h-4 w-4" strokeWidth={1.5} />
              General
            </button>
            <button
              type="button"
              onClick={() => setAudiencia("PRIVADO")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
                audiencia === "PRIVADO"
                  ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                  : "text-muted"
              }`}
            >
              <UserRound className="h-4 w-4" strokeWidth={1.5} />
              Privado
            </button>
          </div>

          {audiencia === "TODOS" ? (
            <p className="text-xs text-muted">
              Este aviso lo verán todos los vendedores y demás admins registrados (menos tú).
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Elige a quién va dirigido
              </p>
              {personas.length === 0 ? (
                <p className="text-xs text-muted">No hay más personas aprobadas todavía.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {personas.map((p) => {
                    const activo = destinatarios.includes(p.nombre);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => alternarDestinatario(p.nombre)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-500 ease-spring ${
                          activo
                            ? "bg-primary text-white"
                            : "bg-surface-2 text-muted hover:text-foreground"
                        }`}
                      >
                        {p.nombre}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                            activo ? "bg-white/20" : "bg-black/5"
                          }`}
                        >
                          {p.rol === ROLES.ADMIN ? "Admin" : "Vend."}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe el aviso…"
            rows={3}
            className="w-full resize-none rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />

          <button
            onClick={handleEnviar}
            disabled={
              !mensaje.trim() || enviando || (audiencia === "PRIVADO" && destinatarios.length === 0)
            }
            className="group flex w-fit items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
          >
            <span className="py-2">Enviar aviso</span>
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

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.15em] text-muted">
            <Megaphone className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Avisos enviados
          </h3>

          {avisos.length === 0 ? (
            <p className="text-sm text-muted">Todavía no se ha enviado ningún aviso.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-silver">
              {avisos.map((a) => (
                <li key={a.id} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{a.autor}</p>
                    <span className="rounded-full bg-silver px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                      {a.audiencia === "PRIVADO"
                        ? `Privado: ${a.destinatarios.join(", ")}`
                        : "General"}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{a.mensaje}</p>
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
