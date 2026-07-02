"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSesion } from "@/lib/session-context";
import {
  LayoutGrid,
  UserPlus,
  LogOut,
  History,
  Users,
  UploadCloud,
} from "lucide-react";

const links = [
  { href: "/", label: "Clientes", icon: LayoutGrid },
  { href: "/clientes/nuevo", label: "Nuevo cliente", icon: UserPlus },
  { href: "/clientes/importar", label: "Importar CSV", icon: UploadCloud },
  { href: "/actividad", label: "Actividad", icon: History },
];

const linksAdmin = [{ href: "/vendedores", label: "Vendedores", icon: Users }];

export function Sidebar() {
  const pathname = usePathname();
  const { sesion, cerrarSesion } = useSesion();
  const itemsNav = sesion?.rol === "ADMIN" ? [...links, ...linksAdmin] : links;

  return (
    <aside className="sticky top-6 flex h-fit w-full flex-col gap-4 md:w-64">
      <div className="brand-plate relative flex h-16 items-center justify-center rounded-[1.75rem] px-4 shadow-[0_16px_36px_-14px_rgba(10,92,255,0.6)]">
        <div className="relative h-28 w-full">
          <Image
            src="/legendar-ia-logo.png"
            alt="Legendar-IA CRM"
            fill
            priority
            className="object-contain"
          />
        </div>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <nav className="core flex flex-col gap-1 rounded-[calc(1.75rem-0.5rem)] p-2">
          {itemsNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-500 ease-spring ${
                  active
                    ? "bg-primary text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-transform duration-500 ease-spring group-hover:translate-x-0.5 ${
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
    </aside>
  );
}
