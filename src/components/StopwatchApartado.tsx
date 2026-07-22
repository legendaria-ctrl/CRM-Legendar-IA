"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function partes(msTranscurrido: number) {
  const total = Math.max(0, msTranscurrido);
  const dias = Math.floor(total / (1000 * 60 * 60 * 24));
  const horas = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((total / (1000 * 60)) % 60);
  const segundos = Math.floor((total / 1000) % 60);
  return { dias, horas, minutos, segundos };
}

// Cronómetro que cuenta hacia adelante desde el primer abono (cuando el
// seguimiento se convierte en apartado). A diferencia de CountdownTimer no
// tiene fecha de fin: solo mide cuánto lleva esperando a que se liquide.
export function StopwatchApartado({ fechaInicio }: { fechaInicio: string }) {
  const inicio = new Date(fechaInicio).getTime();
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (ahora === null) return null;

  const { dias, horas, minutos, segundos } = partes(ahora - inicio);
  const unidades = [
    { valor: dias, label: "días" },
    { valor: horas, label: "hrs" },
    { valor: minutos, label: "min" },
    { valor: segundos, label: "seg" },
  ];

  return (
    <div className="shell rounded-[2rem] p-2 diffused-lg">
      <div className="core rounded-[calc(2rem-0.5rem)] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Timer className="h-4 w-4 text-success" strokeWidth={1.5} />
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
            Apartado desde
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {unidades.map(({ valor, label }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-2xl bg-success/10 py-4"
            >
              <span className="font-mono text-2xl font-semibold tabular-nums text-success">
                {String(valor).padStart(2, "0")}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-success/70">
                {label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-muted">
          Desde el {new Date(inicio).toLocaleDateString("es-MX")}, esperando el resto del pago.
        </p>
      </div>
    </div>
  );
}
