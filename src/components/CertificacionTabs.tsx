"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Layers, Plus } from "lucide-react";
import { CERTIFICACIONES } from "@/lib/certificaciones";
import { useCertificacion } from "@/lib/certificacion-context";

export function CertificacionTabs() {
  const router = useRouter();
  const { certificacionActual, setCertificacionActual, hidratado } = useCertificacion();

  if (!hidratado) return null;

  function irAInicio() {
    setCertificacionActual(null);
    router.push("/");
  }

  function irACertificacion(id: string) {
    setCertificacionActual(id);
    router.push("/");
  }

  return (
    <div className="shell mb-6 rounded-[1.75rem] p-2 diffused">
      <div className="core flex items-center gap-2 overflow-x-auto rounded-[calc(1.75rem-0.5rem)] p-2">
        <button
          onClick={irAInicio}
          title="Inicio · Certificaciones"
          className={`flex flex-none items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
            certificacionActual === null
              ? "bg-primary text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)]"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" strokeWidth={1.75} />
          Certificaciones
        </button>

        <div className="mx-1 h-6 w-px flex-none bg-silver-deep/60" />

        {CERTIFICACIONES.map((cert) => {
          const activo = certificacionActual?.id === cert.id;
          return (
            <button
              key={cert.id}
              onClick={() => irACertificacion(cert.id)}
              title={cert.nombre}
              className={`flex flex-none items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
                activo
                  ? "bg-primary text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)]"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {cert.logo ? (
                <span className="relative h-5 w-5 flex-none overflow-hidden rounded-md bg-white/90">
                  <Image src={cert.logo} alt={cert.nombre} fill className="object-contain" />
                </span>
              ) : null}
              {cert.nombre}
            </button>
          );
        })}

        <button
          disabled
          title="Agregar certificación (próximamente)"
          className="flex flex-none items-center gap-1.5 rounded-2xl border border-dashed border-silver-deep/60 px-3 py-2.5 text-xs font-medium text-muted/60"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Agregar
        </button>
      </div>
    </div>
  );
}
