"use client";

import { useState } from "react";
import { Check, X, LoaderCircle } from "lucide-react";
import { actualizarMensajeBienvenida } from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";
import { ESTADOS_BIENVENIDA, BIENVENIDA_LABEL, EstadoBienvenida } from "@/lib/constants";

export function MensajeBienvenidaToggle({
  clienteId,
  clienteNombre,
  estado,
  compacto = false,
}: {
  clienteId: string;
  clienteNombre: string;
  estado: EstadoBienvenida;
  compacto?: boolean;
}) {
  const { sesion } = useSesion();
  const [cargando, setCargando] = useState(false);

  async function cambiar(nuevoEstado: EstadoBienvenida) {
    if (!sesion || cargando || nuevoEstado === estado) return;
    setCargando(true);
    try {
      await actualizarMensajeBienvenida(
        clienteId,
        clienteNombre,
        { nombre: sesion.nombre, rol: sesion.rol },
        nuevoEstado
      );
    } finally {
      setCargando(false);
    }
  }

  if (!compacto) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-surface-2 p-1">
        {Object.values(ESTADOS_BIENVENIDA).map((valor) => (
          <button
            key={valor}
            onClick={() => cambiar(valor)}
            disabled={cargando}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-500 ease-spring disabled:opacity-50 ${
              estado === valor
                ? valor === ESTADOS_BIENVENIDA.INVALIDO
                  ? "bg-danger/15 text-danger"
                  : valor === ESTADOS_BIENVENIDA.ENVIADA
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning"
                : "text-muted hover:text-foreground"
            }`}
          >
            {BIENVENIDA_LABEL[valor]}
          </button>
        ))}
      </div>
    );
  }

  async function toggleCompacto(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await cambiar(
      estado === ESTADOS_BIENVENIDA.ENVIADA
        ? ESTADOS_BIENVENIDA.PENDIENTE
        : ESTADOS_BIENVENIDA.ENVIADA
    );
  }

  const esInvalido = estado === ESTADOS_BIENVENIDA.INVALIDO;
  const esEnviada = estado === ESTADOS_BIENVENIDA.ENVIADA;

  return (
    <button
      onClick={toggleCompacto}
      disabled={cargando}
      title={BIENVENIDA_LABEL[estado]}
      className={`flex h-6 w-6 flex-none items-center justify-center rounded-lg transition-all duration-500 ease-spring active:scale-90 ${
        esInvalido
          ? "bg-danger/15 text-danger"
          : esEnviada
            ? "bg-success/15 text-success"
            : "bg-warning/15 text-warning"
      }`}
    >
      {cargando ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
      ) : esInvalido ? (
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : esEnviada ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <div className="h-2 w-2 rounded-full bg-warning" />
      )}
    </button>
  );
}
