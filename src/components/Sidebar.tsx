"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/session-context";
import { useCertificacion } from "@/lib/certificacion-context";
import {
  LayoutGrid,
  UserPlus,
  LogOut,
  History,
  Users,
  UploadCloud,
  Tag,
} from "lucide-react";

const links = [
  { href: "/", label: "Clientes", icon: LayoutGrid },
  { href: "/clientes/nuevo", label: "Nuevo cliente", icon: UserPlus },
  { href: "/tags", label: "Tags", icon: Tag },
];

const linksAdmin = [
  { href: "/clientes/importar", label: "Importar CSV", icon: UploadCloud },
  { href: "/actividad", label: "Actividad", icon: History },
  { href: "/vendedores", label: "Vendedores", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sesion, cerrarSesion } = useSesion();
  const { setCertificacionActual } = useCertificacion();
  const itemsNav = sesion?.rol === "ADMIN" ? [...links, ...linksAdmin] : links;

  function irAInicio() {
    setCertificacionActual(null);
    router.push("/");
  }

  return (
    <aside className="flex h-fit w-full flex-col gap-4 md:sticky md:top-6 md:w-64">
      <div className="flex items-center gap-3">
        <button
          onClick={irAInicio}
          title="Ir a Certificaciones"
          className="relative flex h-20 flex-1 items-center justify-center rounded-[1.75rem] bg-white px-4 shadow-[0_10px_24px_-10px_rgba(11,18,32,0.35)] transition-transform duration-500 ease-spring active:scale-[0.98] md:h-24"
        >
          <span className="relative h-full w-full max-w-[280px]">
            <Image
              src="/certificaciones-logo-full.png"
              alt="Certificaciones"
              fill
              className="object-contain p-1"
              priority
            />
          </span>
        </button>

        <button
          onClick={() => cerrarSesion()}
          title="Cerrar sesión"
          className="flex h-20 w-20 flex-none items-center justify-center rounded-[1.75rem] border border-silver-deep/60 bg-surface-2 text-muted transition-all duration-500 ease-spring hover:border-danger/30 hover:text-danger active:scale-[0.98] md:hidden"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <nav className="core flex gap-1 overflow-x-auto rounded-[calc(1.75rem-0.5rem)] p-2 md:flex-col md:overflow-visible">
          {itemsNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex flex-none items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-500 ease-spring ${
                  active
                    ? "bg-primary text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-none transition-transform duration-500 ease-spring group-hover:translate-x-0.5 ${
                    active ? "text-white" : "text-muted"
                  }`}
                  strokeWidth={1.5}
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="hidden md:block">
        <div className="shell rounded-[1.75rem] p-2 diffused">
          <div className="core flex flex-col gap-3 rounded-[calc(1.75rem-0.5rem)] p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {sesion?.nombre ?? "…"}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-muted">
                {sesion?.rol ?? ""}
              </p>
            </div>
            <button
              onClick={() => cerrarSesion()}
              className="group flex items-center justify-center gap-2 rounded-xl border border-silver-deep/60 bg-surface-2 py-2 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:border-danger/30 hover:text-danger active:scale-[0.98]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
