"use client";

import { useState } from "react";
import { Send, LoaderCircle } from "lucide-react";
import { enviarInvitacion, deshacerInvitacion } from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";

export function InvitacionToggle({
  clienteId,
  clienteNombre,
  enviada,
  puedeDeshacer = true,
  compacto = false,
}: {
  clienteId: string;
  clienteNombre: string;
  enviada: boolean;
  puedeDeshacer?: boolean;
  compacto?: boolean;
}) {
  const { sesion } = useSesion();
  const [cargando, setCargando] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!sesion || cargando) return;
    if (enviada && !puedeDeshacer) return;
    setCargando(true);
    try {
      const autor = { nombre: sesion.nombre, rol: sesion.rol };
      if (enviada) {
        await deshacerInvitacion(clienteId, clienteNombre, autor);
      } else {
        await enviarInvitacion(clienteId, clienteNombre, autor);
      }
    } finally {
      setCargando(false);
    }
  }

  const tamano = compacto ? "h-6 w-6" : "h-7 w-7";

  return (
    <button
      onClick={toggle}
      disabled={cargando || (enviada && !puedeDeshacer)}
      title={enviada && !puedeDeshacer ? "Invitación ya aceptada" : "Invitación enviada"}
      className={`flex ${tamano} flex-none items-center justify-center rounded-lg transition-all duration-500 ease-spring active:scale-90 disabled:cursor-not-allowed ${
        enviada && !puedeDeshacer ? "opacity-70" : ""
      } ${enviada ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
    >
      {cargando ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
      ) : enviada ? (
        <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <div className="h-2 w-2 rounded-full bg-danger" />
      )}
    </button>
  );
}
