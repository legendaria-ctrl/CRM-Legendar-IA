"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useCertificacion } from "@/lib/certificacion-context";
import { useSidebarDrawer } from "@/lib/sidebar-drawer-context";
import { NotificacionesBell } from "@/components/NotificacionesBell";

export function MobileTopBar() {
  const router = useRouter();
  const { setCertificacionActual } = useCertificacion();
  const { setAbierto } = useSidebarDrawer();

  function irAInicio() {
    setCertificacionActual(null);
    router.push("/");
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setAbierto(true)}
        title="Abrir menú"
        className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl border border-silver-deep/60 bg-surface-2 text-muted transition-all duration-500 ease-spring active:scale-[0.98]"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <button
        onClick={irAInicio}
        title="Ir a Certificaciones"
        className="relative h-[52px] flex-1 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_10px_24px_-10px_rgba(11,18,32,0.35)] transition-transform duration-500 ease-spring active:scale-[0.98]"
      >
        <Image
          src="/certificaciones-logo-full.png"
          alt="Certificaciones"
          fill
          className="object-contain"
          priority
        />
      </button>

      <NotificacionesBell />
    </div>
  );
}
