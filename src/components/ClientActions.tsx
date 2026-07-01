"use client";

import { useState } from "react";
import { Send, CheckCircle2, RefreshCcw, StickyNote, LoaderCircle } from "lucide-react";
import { EstadoCliente, ESTADOS_CLIENTE } from "@/lib/constants";
import { enviarInvitacion, aceptarInvitacion, renovarMembresia, agregarNota } from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";

export function ClientActions({
  clienteId,
  estado,
}: {
  clienteId: string;
  estado: EstadoCliente;
}) {
  const { sesion } = useSesion();
  const [loading, setLoading] = useState<string | null>(null);
  const [nota, setNota] = useState("");

  async function run(action: string, notaTexto?: string) {
    if (!sesion) return;
    setLoading(action);
    try {
      if (action === "enviar_invitacion") await enviarInvitacion(clienteId, sesion.nombre);
      if (action === "aceptar_invitacion") await aceptarInvitacion(clienteId, sesion.nombre);
      if (action === "renovar") await renovarMembresia(clienteId, sesion.nombre);
      if (action === "nota" && notaTexto) await agregarNota(clienteId, sesion.nombre, notaTexto);
      setNota("");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="shell rounded-[2rem] p-2 diffused-lg">
      <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
        <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-muted">
          Acciones
        </h3>

        <div className="flex flex-wrap gap-3">
          {estado === ESTADOS_CLIENTE.NUEVO && (
            <ActionButton
              icon={Send}
              label="Enviar invitación"
              loading={loading === "enviar_invitacion"}
              onClick={() => run("enviar_invitacion")}
            />
          )}

          {estado === ESTADOS_CLIENTE.INVITACION_ENVIADA && (
            <ActionButton
              icon={CheckCircle2}
              label="Marcar invitación aceptada"
              loading={loading === "aceptar_invitacion"}
              onClick={() => run("aceptar_invitacion")}
            />
          )}

          {(estado === ESTADOS_CLIENTE.ACTIVO || estado === ESTADOS_CLIENTE.VENCIDO) && (
            <ActionButton
              icon={RefreshCcw}
              label="Renovar membresía (1 año)"
              loading={loading === "renovar"}
              onClick={() => run("renovar")}
            />
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
            <StickyNote className="h-3.5 w-3.5" strokeWidth={1.5} />
            Agregar nota
          </label>
          <div className="flex gap-2">
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Escribe una nota sobre el cliente…"
              className="flex-1 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
            <button
              disabled={!nota.trim() || loading === "nota"}
              onClick={() => run("nota", nota)}
              className="flex items-center justify-center rounded-2xl bg-surface-2 px-4 text-sm font-medium text-primary transition-all duration-500 ease-spring hover:bg-primary-dim active:scale-[0.98] disabled:opacity-40"
            >
              {loading === "nota" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  icon: typeof Send;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
    >
      <span className="py-2">{label}</span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
        {loading ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
        ) : (
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
      </span>
    </button>
  );
}
