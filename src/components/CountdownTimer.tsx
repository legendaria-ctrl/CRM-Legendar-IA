"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function partes(msRestante: number) {
  const total = Math.max(0, msRestante);
  const dias = Math.floor(total / (1000 * 60 * 60 * 24));
  const horas = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((total / (1000 * 60)) % 60);
  const segundos = Math.floor((total / 1000) % 60);
  return { dias, horas, minutos, segundos };
}

export function CountdownTimer({
  fechaAceptacion,
  fechaVencimiento,
}: {
  fechaAceptacion: string;
  fechaVencimiento: string;
}) {
  const inicio = new Date(fechaAceptacion).getTime();
  const fin = new Date(fechaVencimiento).getTime();
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (ahora === null) return null;

  const restante = fin - ahora;
  const { dias, horas, minutos, segundos } = partes(restante);
  const vencida = restante <= 0;
  const progreso = Math.min(100, Math.max(0, ((ahora - inicio) / (fin - inicio)) * 100));

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
          <Timer className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
            {vencida ? "Membresía vencida" : "Tiempo restante de membresía"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {unidades.map(({ valor, label }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-2xl bg-primary-dim py-4"
            >
              <span className="font-mono text-2xl font-semibold tabular-nums text-primary-deep">
                {String(valor).padStart(2, "0")}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-primary-deep/60">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-silver">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-glow to-primary transition-all duration-1000 ease-spring"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>{new Date(inicio).toLocaleDateString("es-MX")}</span>
            <span>{new Date(fin).toLocaleDateString("es-MX")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
