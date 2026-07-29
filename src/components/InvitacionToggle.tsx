"use client";

import { useState } from "react";
import { Send, LoaderCircle } from "lucide-react";
import { enviarInvitacion, deshacerInvitacion } from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";
import { ResultadoPopup } from "@/components/ResultadoPopup";

export function InvitacionToggle({
  clienteId,
  clienteNombre,
  clienteCorreo,
  enviada,
  puedeDeshacer = true,
  compacto = false,
}: {
  clienteId: string;
  clienteNombre: string;
  clienteCorreo?: string | null;
  enviada: boolean;
  puedeDeshacer?: boolean;
  compacto?: boolean;
}) {
  const { sesion } = useSesion();
  const [cargando, setCargando] = useState(false);
  const [popup, setPopup] = useState<{
    titulo: string;
    mensaje: string;
    tipo: "success" | "error";
  } | null>(null);

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
        const resultado = await enviarInvitacion(clienteId, clienteNombre, autor, clienteCorreo);
        if (resultado.skoolOk) {
          setPopup({
            titulo: "Invitación enviada",
            mensaje: `"${clienteNombre}" quedó marcado en el CRM y el aviso real a Skool se envió correctamente.`,
            tipo: "success",
          });
        } else {
          setPopup({
            titulo: "Falló el envío a Skool",
            mensaje: `"${clienteNombre}" quedó marcado como "Invitación enviada" en el CRM, pero el aviso real a Skool falló:\n\n${resultado.skoolError}\n\nEntra a su perfil y usa "Reenviar invitación a Skool" para reintentar.`,
            tipo: "error",
          });
        }
      }
    } finally {
      setCargando(false);
    }
  }

  const tamano = compacto ? "h-6 w-6" : "h-7 w-7";

  return (
    <>
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

      {popup && (
        <ResultadoPopup
          titulo={popup.titulo}
          mensaje={popup.mensaje}
          tipo={popup.tipo}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  );
}
