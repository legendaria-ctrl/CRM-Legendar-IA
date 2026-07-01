"use client";

import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { actualizarMensajeBienvenida } from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";

export function MensajeBienvenidaToggle({
  clienteId,
  clienteNombre,
  enviado,
  compacto = false,
}: {
  clienteId: string;
  clienteNombre: string;
  enviado: boolean;
  compacto?: boolean;
}) {
  const { sesion } = useSesion();
  const [cargando, setCargando] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!sesion || cargando) return;
    setCargando(true);
    try {
      await actualizarMensajeBienvenida(
        clienteId,
        clienteNombre,
        { nombre: sesion.nombre, rol: sesion.rol },
        !enviado
      );
    } finally {
      setCargando(false);
    }
  }

  const tamano = compacto ? "h-6 w-6" : "h-7 w-7";

  return (
    <button
      onClick={toggle}
      disabled={cargando}
      title="Mensaje de bienvenida"
      className={`flex ${tamano} flex-none items-center justify-center rounded-lg transition-all duration-500 ease-spring active:scale-90 ${
        enviado ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
      }`}
    >
      {cargando ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
      ) : enviado ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <div className="h-2 w-2 rounded-full bg-danger" />
      )}
    </button>
  );
}
