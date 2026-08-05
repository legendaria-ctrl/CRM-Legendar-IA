"use client";

import { useEffect, useState } from "react";
import { AlarmClock, Timer, TriangleAlert, Lock } from "lucide-react";
import { calcularSlaLead } from "@/lib/leadSla";
import { ESTADOS_CLIENTE } from "@/lib/constants";

// Barra de SLA de contacto (48h) para leads en la ficha del cliente: verde
// mientras hay tiempo, amarilla en las últimas 12h, roja si ya venció (y
// bloqueado), o un aviso de alarma pendiente si hay una programada.
export function LeadSlaBar({
  estado,
  fechaAsignacion,
  alarmaFechaDato,
}: {
  estado: string;
  fechaAsignacion: Date | null;
  alarmaFechaDato: Date | null;
}) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (ahora === null) return null;

  const info = calcularSlaLead(
    { estado, fechaAsignacion, alarmaFecha: alarmaFechaDato },
    ahora
  );

  if (info.estadoSla === "sin_reloj") return null;

  if (info.estadoSla === "pausado_alarma" && info.alarmaFecha) {
    return (
      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex items-center gap-3 rounded-[calc(2rem-0.5rem)] p-5">
          <AlarmClock className="h-5 w-5 flex-none text-warning" strokeWidth={1.5} />
          <p className="text-sm text-foreground">
            Plazo de contacto en pausa: alarma programada para{" "}
            <span className="font-medium">{info.alarmaFecha.toLocaleString("es-MX")}</span>. El
            SLA de 48h arranca en cuanto llegue esa hora.
          </p>
        </div>
      </div>
    );
  }

  if (!info.inicio || !info.limite) return null;

  const totalMs = info.limite.getTime() - info.inicio.getTime();
  const transcurridoMs = ahora - info.inicio.getTime();
  const progreso = Math.min(100, Math.max(0, (transcurridoMs / totalMs) * 100));
  const restanteMs = info.limite.getTime() - ahora;

  const paleta =
    info.estadoSla === "vencido"
      ? { bar: "bg-danger", text: "text-danger", bg: "bg-danger/10", Icon: Lock }
      : info.estadoSla === "alerta"
        ? { bar: "bg-warning", text: "text-warning", bg: "bg-warning/10", Icon: TriangleAlert }
        : { bar: "bg-gradient-to-r from-primary-glow to-primary", text: "text-primary-deep", bg: "bg-primary-dim", Icon: Timer };

  const horasRestantes = Math.max(0, Math.floor(restanteMs / (1000 * 60 * 60)));
  const minutosRestantes = Math.max(0, Math.floor((restanteMs / (1000 * 60)) % 60));

  return (
    <div className="shell rounded-[2rem] p-2 diffused-lg">
      <div className={`core flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] p-5 ${paleta.bg}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={`flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] ${paleta.text}`}>
            <paleta.Icon className="h-4 w-4" strokeWidth={1.75} />
            {info.estadoSla === "vencido"
              ? "SLA de contacto vencido — bloqueado"
              : "Plazo para contactar (48h)"}
          </span>
          {info.estadoSla !== "vencido" && (
            <span className={`text-sm font-semibold tabular-nums ${paleta.text}`}>
              {String(horasRestantes).padStart(2, "0")}h {String(minutosRestantes).padStart(2, "0")}m
            </span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-spring ${paleta.bar}`}
            style={{ width: `${progreso}%` }}
          />
        </div>
        {estado === ESTADOS_CLIENTE.SEGUIMIENTO && info.estadoSla === "vencido" && (
          <p className="text-xs text-danger/80">
            El vendedor ya no puede editar este lead. Reasígnalo desde Pendientes o cambiando el
            vendedor aquí arriba.
          </p>
        )}
      </div>
    </div>
  );
}
