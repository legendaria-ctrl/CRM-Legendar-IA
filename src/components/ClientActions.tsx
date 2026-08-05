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
  ShieldCheck,
  Hourglass,
  AlarmClock,
  Lock,
} from "lucide-react";
import { EstadoCliente, ESTADOS_CLIENTE, ROLES } from "@/lib/constants";
import {
  enviarInvitacion,
  aceptarInvitacion,
  renovarMembresia,
  agregarNota,
  darSeguimientoLead,
  establecerAlarmaLead,
  cancelarAlarmaLead,
  deshacerInvitacion,
  deshacerAceptacion,
  pausarMembresia,
  reanudarMembresia,
  agregarDiasMembresia,
  reenviarInvitacionSkool,
  establecerDiasRestantes,
  enviarAAutorizacion,
  autorizarCliente,
} from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";
import { ResultadoPopup } from "@/components/ResultadoPopup";

export function ClientActions({
  clienteId,
  clienteNombre,
  clienteCorreo,
  estado,
  pausada = false,
  fechaVencimiento = null,
  fechaPausa = null,
  puedeEditar = true,
  bloqueadoSla = false,
  alarmaFecha = null,
  alarmaNota = null,
  alarmaAnticipacionMin = null,
}: {
  clienteId: string;
  clienteNombre: string;
  clienteCorreo?: string | null;
  estado: EstadoCliente;
  pausada?: boolean;
  fechaVencimiento?: Date | null;
  fechaPausa?: Date | null;
  /** Solo aplica a acciones sobre un seguimiento (dueño o admin); el resto
   * de acciones (invitación, membresía, etc.) no dependen de esto. */
  puedeEditar?: boolean;
  /** Lead (SEGUIMIENTO) que superó las 48h de SLA sin que un admin lo haya
   * reasignado: el vendedor no puede tocar nada aquí (ni nota ni alarma). */
  bloqueadoSla?: boolean;
  alarmaFecha?: Date | null;
  alarmaNota?: string | null;
  alarmaAnticipacionMin?: number | null;
}) {
  const { sesion, cargando } = useSesion();
  const [loading, setLoading] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [popupInvitacion, setPopupInvitacion] = useState<{
    titulo: string;
    mensaje: string;
    tipo: "success" | "error";
  } | null>(null);
  const [diasPersonalizados, setDiasPersonalizados] = useState("");
  const [diasRestantes, setDiasRestantes] = useState("");
  const [alarmaFechaInput, setAlarmaFechaInput] = useState("");
  const [alarmaNotaInput, setAlarmaNotaInput] = useState("");
  const [alarmaAnticipacionInput, setAlarmaAnticipacionInput] = useState("30");
  const esVendedor = sesion?.rol === ROLES.VENDEDOR;
  const esLead = estado === ESTADOS_CLIENTE.SEGUIMIENTO;
  const mostrarTemporizador =
    !esVendedor &&
    !!fechaVencimiento &&
    estado !== ESTADOS_CLIENTE.SEGUIMIENTO &&
    estado !== ESTADOS_CLIENTE.PENDIENTE_AUTORIZACION;

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
      if (action === "enviar_invitacion") {
        const resultado = await enviarInvitacion(clienteId, clienteNombre, autor, clienteCorreo);
        if (resultado.skoolOk) {
          setPopupInvitacion({
            titulo: "Invitación enviada",
            mensaje: "Se marcó en el CRM y el aviso real a Skool se envió correctamente.",
            tipo: "success",
          });
        } else {
          setPopupInvitacion({
            titulo: "Falló el envío a Skool",
            mensaje: `El cliente quedó marcado como "Invitación enviada" en el CRM, pero el aviso real a Skool falló:\n\n${resultado.skoolError}\n\nUsa "Reenviar invitación a Skool" abajo para reintentar.`,
            tipo: "error",
          });
        }
      }
      if (action === "aceptar_invitacion") await aceptarInvitacion(clienteId, clienteNombre, autor);
      if (action === "renovar" && fechaVencimiento) {
        await renovarMembresia(clienteId, clienteNombre, autor, fechaVencimiento);
        setNota(`Renovó el ${new Date().toLocaleDateString("es-MX")}`);
      }
      if (action === "nota" && notaTexto) {
        if (esLead) {
          await darSeguimientoLead(clienteId, clienteNombre, autor, notaTexto);
        } else {
          await agregarNota(clienteId, clienteNombre, autor, notaTexto);
        }
        setNota("");
      }
      if (action === "poner_alarma") {
        if (!alarmaFechaInput) {
          setError("Elige fecha y hora para la alarma.");
          return;
        }
        const fecha = new Date(alarmaFechaInput);
        if (Number.isNaN(fecha.getTime()) || fecha.getTime() <= Date.now()) {
          setError("La alarma debe ser una fecha y hora futura.");
          return;
        }
        const anticipacionMin = Number(alarmaAnticipacionInput);
        if (!anticipacionMin || anticipacionMin <= 0) {
          setError("Escribe cuántos minutos antes quieres el aviso.");
          return;
        }
        await establecerAlarmaLead(
          clienteId,
          clienteNombre,
          autor,
          fecha,
          alarmaNotaInput,
          anticipacionMin
        );
        setAlarmaFechaInput("");
        setAlarmaNotaInput("");
        setAlarmaAnticipacionInput("30");
      }
      if (action === "cancelar_alarma") {
        await cancelarAlarmaLead(clienteId, clienteNombre, autor);
      }
      if (action === "deshacer_invitacion") await deshacerInvitacion(clienteId, clienteNombre, autor);
      if (action === "deshacer_aceptacion") await deshacerAceptacion(clienteId, clienteNombre, autor);
      if (action === "pausar") await pausarMembresia(clienteId, clienteNombre, autor);
      if (action === "reanudar" && fechaVencimiento && fechaPausa)
        await reanudarMembresia(clienteId, clienteNombre, autor, fechaVencimiento, fechaPausa);
      if (action === "agregar_dias" && fechaVencimiento)
        await agregarDiasMembresia(clienteId, clienteNombre, autor, fechaVencimiento, 30);
      if (action === "agregar_dias_personalizados" && fechaVencimiento) {
        const dias = Number(diasPersonalizados);
        if (!dias || dias <= 0) {
          setError("Escribe un número de días válido.");
          return;
        }
        await agregarDiasMembresia(clienteId, clienteNombre, autor, fechaVencimiento, dias);
        setDiasPersonalizados("");
      }
      if (action === "establecer_dias_restantes") {
        const dias = Number(diasRestantes);
        if (!Number.isFinite(dias)) {
          setError("Escribe un número de días válido (puede ser negativo).");
          return;
        }
        await establecerDiasRestantes(clienteId, clienteNombre, autor, dias);
        setDiasRestantes("");
      }
      if (action === "reenviar_skool" && clienteCorreo) {
        try {
          await reenviarInvitacionSkool(clienteId, clienteNombre, autor, clienteCorreo);
          setPopupInvitacion({
            titulo: "Invitación reenviada",
            mensaje: `Skool respondió correctamente al reenvío a ${clienteCorreo}.`,
            tipo: "success",
          });
        } catch (err) {
          setPopupInvitacion({
            titulo: "Falló el reenvío a Skool",
            mensaje: err instanceof Error ? err.message : "No se pudo invitar a Skool.",
            tipo: "error",
          });
        }
      }
      if (action === "enviar_a_autorizacion")
        await enviarAAutorizacion(clienteId, clienteNombre, autor);
      if (action === "autorizar")
        await autorizarCliente(clienteId, clienteNombre, autor, clienteCorreo);
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
          {!esVendedor && estado === ESTADOS_CLIENTE.SEGUIMIENTO && puedeEditar && (
            <ActionButton
              icon={Hourglass}
              label="Enviar a autorización"
              loading={loading === "enviar_a_autorizacion"}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Enviar este seguimiento a revisión? Ya no podrás editarlo hasta que un administrador lo autorice."
                  )
                ) {
                  run("enviar_a_autorizacion");
                }
              }}
            />
          )}

          {!esVendedor && estado === ESTADOS_CLIENTE.PENDIENTE_AUTORIZACION && sesion?.rol === ROLES.ADMIN && (
            <ActionButton
              icon={ShieldCheck}
              label="Autorizar"
              loading={loading === "autorizar"}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Autorizar a este cliente? Se le enviará la invitación real de inmediato."
                  )
                ) {
                  run("autorizar");
                }
              }}
            />
          )}

          {!esVendedor && estado === ESTADOS_CLIENTE.NUEVO && (
            <ActionButton
              icon={Send}
              label="Enviar invitación"
              loading={loading === "enviar_invitacion"}
              onClick={() => run("enviar_invitacion")}
            />
          )}

          {!esVendedor && estado === ESTADOS_CLIENTE.INVITACION_ENVIADA && (
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

          {!esVendedor && (estado === ESTADOS_CLIENTE.ACTIVO || estado === ESTADOS_CLIENTE.VENCIDO) && (
            <>
              <ActionButton
                icon={RefreshCcw}
                label="Renovar membresía (1 año)"
                loading={loading === "renovar"}
                onClick={() => {
                  if (window.confirm("¿Seguro que quieres renovar? Se sumarán 365 días a la fecha de vencimiento actual.")) {
                    run("renovar");
                  }
                }}
              />
              <UndoButton
                label="Deshacer aceptación"
                loading={loading === "deshacer_aceptacion"}
                onClick={() => run("deshacer_aceptacion")}
              />
            </>
          )}

          {clienteCorreo &&
            estado !== ESTADOS_CLIENTE.SEGUIMIENTO &&
            estado !== ESTADOS_CLIENTE.PENDIENTE_AUTORIZACION && (
            <UndoButton
              icon={Send}
              label="Reenviar invitación a Skool"
              loading={loading === "reenviar_skool"}
              onClick={() => run("reenviar_skool")}
            />
          )}

          {mostrarTemporizador && (
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

        {mostrarTemporizador && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
              <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Agregar días personalizados
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={diasPersonalizados}
                onChange={(e) => setDiasPersonalizados(e.target.value)}
                placeholder="Ej. 15"
                className="w-28 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
              <button
                disabled={!diasPersonalizados.trim() || loading === "agregar_dias_personalizados"}
                onClick={() => run("agregar_dias_personalizados")}
                className="flex items-center justify-center rounded-2xl bg-surface-2 px-4 text-sm font-medium text-primary transition-all duration-500 ease-spring hover:bg-primary-dim active:scale-[0.98] disabled:opacity-40"
              >
                {loading === "agregar_dias_personalizados" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  "Agregar"
                )}
              </button>
            </div>
          </div>
        )}

        {mostrarTemporizador && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
              <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Corregir días restantes (desde hoy)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={diasRestantes}
                onChange={(e) => setDiasRestantes(e.target.value)}
                placeholder="Ej. 20"
                className="w-28 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
              <button
                disabled={!diasRestantes.trim() || loading === "establecer_dias_restantes"}
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Establecer el tiempo restante en ${diasRestantes} días a partir de hoy? Esto reemplaza la fecha de vencimiento actual.`
                    )
                  ) {
                    run("establecer_dias_restantes");
                  }
                }}
                className="flex items-center justify-center rounded-2xl bg-surface-2 px-4 text-sm font-medium text-primary transition-all duration-500 ease-spring hover:bg-primary-dim active:scale-[0.98] disabled:opacity-40"
              >
                {loading === "establecer_dias_restantes" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  "Corregir"
                )}
              </button>
            </div>
            <p className="text-xs text-muted/70">
              Usa esto para corregir el temporizador si le diste sin querer a renovar u otra acción.
            </p>
          </div>
        )}

        {bloqueadoSla ? (
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            <Lock className="h-4 w-4 flex-none" strokeWidth={1.75} />
            Este lead superó las 48h sin seguimiento y quedó bloqueado. Un administrador debe
            reasignarlo para que se pueda volver a tocar.
          </div>
        ) : (
          <>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                <StickyNote className="h-3.5 w-3.5" strokeWidth={1.5} />
                Agregar nota
                {esLead && (
                  <span className="normal-case tracking-normal text-muted/70">
                    (cuenta como seguimiento dado: reinicia el plazo de 48h)
                  </span>
                )}
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

            {esLead && puedeEditar && (
              <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-dashed border-silver-deep/60 p-4">
                <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                  <AlarmClock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Alarma ("háblame tal día")
                </label>
                {alarmaFecha ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warning/10 px-3 py-2.5">
                    <p className="text-sm text-warning">
                      Programada para {alarmaFecha.toLocaleString("es-MX")} (aviso{" "}
                      {alarmaAnticipacionMin ?? 30} min antes)
                      {alarmaNota ? ` · ${alarmaNota}` : ""}
                    </p>
                    <button
                      disabled={loading === "cancelar_alarma"}
                      onClick={() => run("cancelar_alarma")}
                      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-warning transition-colors duration-200 hover:bg-warning/20 disabled:opacity-50"
                    >
                      {loading === "cancelar_alarma" ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                      ) : (
                        "Cancelar alarma"
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted/70">
                      Mientras esté programada, el plazo de 48h se pausa. Antes de que suene, este
                      lead sube al principio de tu lista de Seguimientos y te llega una
                      notificación.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="datetime-local"
                        value={alarmaFechaInput}
                        onChange={(e) => setAlarmaFechaInput(e.target.value)}
                        className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                      />
                      <input
                        value={alarmaNotaInput}
                        onChange={(e) => setAlarmaNotaInput(e.target.value)}
                        placeholder='Ej. "Dijo que le hable el jueves 10am"'
                        className="flex-1 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                      />
                      <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                        Avisar
                        <input
                          type="number"
                          min={1}
                          value={alarmaAnticipacionInput}
                          onChange={(e) => setAlarmaAnticipacionInput(e.target.value)}
                          className="w-16 rounded-xl border border-silver-deep/60 bg-surface-2 px-2 py-2 text-center text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                        />
                        min antes
                      </label>
                      <button
                        disabled={!alarmaFechaInput || loading === "poner_alarma"}
                        onClick={() => run("poner_alarma")}
                        className="flex items-center justify-center gap-1.5 rounded-2xl bg-warning/15 px-4 py-2.5 text-sm font-medium text-warning transition-all duration-500 ease-spring hover:bg-warning/25 active:scale-[0.98] disabled:opacity-40"
                      >
                        {loading === "poner_alarma" ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                        ) : (
                          "Programar"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {popupInvitacion && (
        <ResultadoPopup
          titulo={popupInvitacion.titulo}
          mensaje={popupInvitacion.mensaje}
          tipo={popupInvitacion.tipo}
          onClose={() => setPopupInvitacion(null)}
        />
      )}
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
