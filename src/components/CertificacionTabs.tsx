"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { CERTIFICACIONES } from "@/lib/certificaciones";
import { useCertificacion } from "@/lib/certificacion-context";

export function CertificacionTabs() {
  const router = useRouter();
  const { setCertificacionActual, hidratado } = useCertificacion();

  if (!hidratado) return null;

  function irACertificacion(id: string) {
    setCertificacionActual(id);
    router.push("/");
  }

  return (
    <div className="shell mb-6 rounded-[1.75rem] p-2 diffused">
      <div className="core flex flex-wrap items-center gap-2 rounded-[calc(1.75rem-0.5rem)] p-2">
        {CERTIFICACIONES.map((cert) => {
          return (
            <button
              key={cert.id}
              onClick={() => irACertificacion(cert.id)}
              title={cert.nombre}
              className="flex h-11 flex-none items-center overflow-visible rounded-2xl bg-primary px-4 shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring"
            >
              {cert.logo ? (
                <span className="relative h-24 w-32 flex-none">
                  <Image src={cert.logo} alt={cert.nombre} fill className="object-contain" />
                </span>
              ) : (
                <span className="text-sm font-medium text-white">{cert.nombre}</span>
              )}
            </button>
          );
        })}

        <button
          disabled
          title="Agregar certificación (próximamente)"
          className="flex h-11 flex-none items-center gap-1.5 rounded-2xl border border-dashed border-silver-deep/60 px-3 py-2.5 text-xs font-medium text-muted/60"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Agregar
        </button>
      </div>
    </div>
  );
}
