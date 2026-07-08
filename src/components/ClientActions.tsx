"use client";

import { useState } from "react";
import {
  Send,
  CheckCircle2,
  RefreshCcw,
  StickyNote,
  LoaderCircle,
  Undo2,
  Pause,
  Play,
  CalendarPlus,
} from "lucide-react";
import { EstadoCliente, ESTADOS_CLIENTE } from "@/lib/constants";
import {
  enviarInvitacion,
  aceptarInvitacion,
  renovarMembresia,
  agregarNota,
  deshacerInvitacion,
  deshacerAceptacion,
  pausarMembresia,
  reanudarMembresia,
  agregarDiasMembresia,
} from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";

export function ClientActions({
  clienteId,
  clienteNombre,
  clienteCorreo,
  estado,
  puedeDeshacerAceptacion = false,
  pausada = false,
  fechaVencimiento = null,
  fechaPausa = null,
}: {
  clienteId: string;
  clienteNombre: string;
  clienteCorreo?: string | null;
  estado: EstadoCliente;
  puedeDeshacerAceptacion?: boolean;
  pausada?: boolean;
  fechaVencimiento?: Date | null;
  fechaPausa?: Date | null;
}) {
  const { sesion, cargando } = useSesion();
  const [loading, setLoading] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, notaTexto?: string) {
    setError(null);

    if (!sesion) {
      setError(
        "No se detectó tu sesión. Recarga la página (F5) y vuelve a intentar. Si sigue igual, cierra sesión y entra de nuevo."
      );
      return;
    }

    const autor = { nombre: sesion.nombre, rol: sesion.rol };
    setLoading(action);
    try {
      if (action === "enviar_invitacion")
        await enviarInvitacion(clienteId, clienteNombre, autor, clienteCorreo);
      if (action === "aceptar_invitacion") await aceptarInvitacion(clienteId, clienteNombre, autor);
      if (action === "renovar" && fechaVencimiento) {
        await renovarMembresia(clienteId, clienteNombre, autor, fechaVencimiento);
        setNota(`Renovó el ${new Date().toLocaleDateString("es-MX")}`);
      }
      if (action === "nota" && notaTexto) {
        await agregarNota(clienteId, clienteNombre, autor, notaTexto);
        setNota("");
      }
      if (action === "deshacer_invitacion") await deshacerInvitacion(clienteId, clienteNombre, autor);
      if (action === "deshacer_aceptacion") await deshacerAceptacion(clienteId, clienteNombre, autor);
      if (action === "pausar") await pausarMembresia(clienteId, clienteNombre, autor);
      if (action === "reanudar" && fechaVencimiento && fechaPausa)
        await reanudarMembresia(clienteId, clienteNombre, autor, fechaVencimiento, fechaPausa);
      if (action === "agregar_dias" && fechaVencimiento)
        await agregarDiasMembresia(clienteId, clienteNombre, autor, fechaVencimiento, 30);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? `No se pudo completar la acción: ${err.message}` : "No se pudo completar la acción."
      );
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

        {error && <p className="text-sm text-danger">{error}</p>}
        {cargando && <p className="text-sm text-muted">Verificando tu sesión…</p>}

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
            <>
              <ActionButton
                icon={CheckCircle2}
                label="Marcar invitación aceptada"
                loading={loading === "aceptar_invitacion"}
                onClick={() => run("aceptar_invitacion")}
              />
              <UndoButton
                label="Deshacer invitación"
                loading={loading === "deshacer_invitacion"}
                onClick={() => run("deshacer_invitacion")}
              />
            </>
          )}

          {(estado === ESTADOS_CLIENTE.ACTIVO || estado === ESTADOS_CLIENTE.VENCIDO) && (
            <>
              <ActionButton
                icon={RefreshCcw}
                label="Renovar membresía (1 año)"
                loading={loading === "renovar"}
                onClick={() => run("renovar")}
              />
              {puedeDeshacerAceptacion && (
                <UndoButton
                  label="Deshacer aceptación"
                  loading={loading === "deshacer_aceptacion"}
                  onClick={() => run("deshacer_aceptacion")}
                />
              )}
            </>
          )}

          {fechaVencimiento && (
            <>
              {pausada ? (
                <ActionButton
                  icon={Play}
                  label="Reanudar temporizador"
                  loading={loading === "reanudar"}
                  onClick={() => run("reanudar")}
                />
              ) : (
                <UndoButton
                  label="Pausar temporizador"
                  icon={Pause}
                  loading={loading === "pausar"}
                  onClick={() => run("pausar")}
                />
              )}
              <UndoButton
                label="Agregar 30 días"
                icon={CalendarPlus}
                loading={loading === "agregar_dias"}
                onClick={() => run("agregar_dias")}
              />
            </>
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

function UndoButton({
  label,
  loading,
  onClick,
  icon: Icon = Undo2,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  icon?: typeof Undo2;
}) {
  return (
    <button
      onClick={() => {
        if (window.confirm(`${label}?`)) {
          onClick();
        }
      }}
      disabled={loading}
      className="flex items-center gap-2 rounded-full border border-silver-deep/60 bg-surface-2 px-5 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:border-danger/30 hover:text-danger active:scale-[0.98] disabled:opacity-50"
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
      ) : (
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      )}
      {label}
    </button>
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
