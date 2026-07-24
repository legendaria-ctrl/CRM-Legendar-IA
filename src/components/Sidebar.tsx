"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/session-context";
import { useCertificacion } from "@/lib/certificacion-context";
import { useMobileActions } from "@/lib/mobile-actions-context";
import { useSidebarDrawer } from "@/lib/sidebar-drawer-context";
import { SIN_ASIGNAR_ID } from "@/lib/certificaciones";
import { suscribirPendientesAutorizacion } from "@/lib/clientesService";
import {
  LayoutGrid,
  UserPlus,
  LogOut,
  History,
  Users,
  UploadCloud,
  Tag,
  X,
  Megaphone,
  Trash2,
  Bell,
  FolderX,
  Clock,
  Hourglass,
} from "lucide-react";

const NO_ASIGNADOS_HREF = "#no-asignados";

const AVISOS_ITEM = { href: "/notificaciones", label: "Avisos", icon: Bell };

const links = [
  { href: "/", label: "Clientes", icon: LayoutGrid },
  { href: "/seguimientos", label: "Seguimientos", icon: Clock },
  { href: "/tags", label: "Tags", icon: Tag },
];

const linksAdmin = [
  { href: "/clientes/nuevo", label: "Nuevo cliente", icon: UserPlus },
  { href: "/clientes/importar", label: "Importar CSV", icon: UploadCloud },
  { href: "/pendientes", label: "Pendientes", icon: Hourglass },
  { href: "/actividad", label: "Actividad", icon: History },
  { href: "/vendedores", label: "Usuarios", icon: Users },
  { href: "/avisos", label: "Dar avisos", icon: Megaphone },
  AVISOS_ITEM,
  { href: NO_ASIGNADOS_HREF, label: "No asignados", icon: FolderX },
  { href: "/papelera", label: "Papelera", icon: Trash2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sesion, cerrarSesion } = useSesion();
  const { certificacionActual, setCertificacionActual } = useCertificacion();
  const { acciones } = useMobileActions();
  const { abierto, setAbierto } = useSidebarDrawer();
  const itemsNav =
    sesion?.rol === "ADMIN" ? [...links, ...linksAdmin] : [...links, AVISOS_ITEM];
  const [pendientesCount, setPendientesCount] = useState(0);

  useEffect(() => {
    if (sesion?.rol !== "ADMIN") return;
    const unsub = suscribirPendientesAutorizacion(setPendientesCount);
    return () => unsub();
  }, [sesion?.rol]);

  function irAInicio() {
    setCertificacionActual(null);
    setAbierto(false);
    router.push("/");
  }

  function irA(href: string) {
    setAbierto(false);
    if (href === NO_ASIGNADOS_HREF) {
      setCertificacionActual(SIN_ASIGNAR_ID);
      router.push("/");
      return;
    }
    router.push(href);
  }

  const inicial = sesion?.nombre?.trim().charAt(0).toUpperCase() || "?";

  return (
    <>
      {/* Menú lateral móvil (drawer) */}
      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in-fast"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col gap-4 bg-surface p-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(10,92,255,0.5)]">
                  {inicial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {sesion?.nombre ?? "…"}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    {sesion?.rol ?? ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAbierto(false)}
                title="Cerrar menú"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 text-muted"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
              {itemsNav.map(({ href, label, icon: Icon }) => {
                const active =
                  href === NO_ASIGNADOS_HREF
                    ? pathname === "/" && certificacionActual?.id === SIN_ASIGNAR_ID
                    : pathname === href;
                return (
                  <button
                    key={href}
                    onClick={() => irA(href)}
                    className={`group flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2 text-left text-sm font-medium transition-all duration-500 ease-spring ${
                      active
                        ? "bg-primary text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)]"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 flex-none ${active ? "text-white" : "text-muted"}`}
                      strokeWidth={1.5}
                    />
                    {label}
                    {href === "/pendientes" && pendientesCount > 0 && (
                      <span
                        className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                          active ? "bg-white/20 text-white" : "bg-danger text-white"
                        }`}
                      >
                        {pendientesCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {acciones.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-silver-deep/40 pt-3">
                <p className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                  Esta página
                </p>
                {acciones.map((accion) => (
                  <button
                    key={accion.key}
                    onClick={() => {
                      accion.onClick();
                      setAbierto(false);
                    }}
                    disabled={accion.disabled}
                    className="group flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-left text-sm font-medium text-muted transition-all duration-500 ease-spring hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
                  >
                    <accion.icon className="h-4 w-4 flex-none text-muted" strokeWidth={1.5} />
                    {accion.label}
                    {accion.activo && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => cerrarSesion()}
              className="group flex items-center justify-center gap-2 rounded-xl border border-silver-deep/60 bg-surface-2 py-2.5 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:border-danger/30 hover:text-danger active:scale-[0.98]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Sidebar de escritorio */}
      <aside className="hidden w-full flex-col gap-4 md:sticky md:top-[calc(env(safe-area-inset-top,0px)+2.5rem)] md:flex md:max-h-[calc(100vh-2.5rem-env(safe-area-inset-top,0px)-1.5rem)] md:w-64">
        <button
          onClick={irAInicio}
          title="Ir a Certificaciones"
          className="flex h-[84px] w-full flex-none items-center justify-center overflow-hidden rounded-[1.5rem] bg-white shadow-[0_10px_24px_-10px_rgba(11,18,32,0.35)] transition-transform duration-500 ease-spring active:scale-[0.98]"
        >
          <Image
            src="/certificaciones-logo-full.png"
            alt="Certificaciones"
            width={184}
            height={58}
            priority
          />
        </button>

        <div className="shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] p-2 diffused">
          <nav className="core flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto rounded-[calc(1.75rem-0.5rem)] p-2">
            {itemsNav.map(({ href, label, icon: Icon }) => {
              const active =
                href === NO_ASIGNADOS_HREF
                  ? pathname === "/" && certificacionActual?.id === SIN_ASIGNAR_ID
                  : pathname === href;
              const itemClassName = `group flex flex-none items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-500 ease-spring ${
                active
                  ? "bg-primary text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)]"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`;
              const iconClassName = `h-4 w-4 flex-none transition-transform duration-500 ease-spring group-hover:translate-x-0.5 ${
                active ? "text-white" : "text-muted"
              }`;

              const badge = href === "/pendientes" && pendientesCount > 0 && (
                <span
                  className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-danger text-white"
                  }`}
                >
                  {pendientesCount}
                </span>
              );

              return href === NO_ASIGNADOS_HREF ? (
                <button key={href} onClick={() => irA(href)} className={`text-left ${itemClassName}`}>
                  <Icon className={iconClassName} strokeWidth={1.5} />
                  {label}
                  {badge}
                </button>
              ) : (
                <Link key={href} href={href} className={itemClassName}>
                  <Icon className={iconClassName} strokeWidth={1.5} />
                  {label}
                  {badge}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shell flex-none rounded-[1.75rem] p-2 diffused">
          <div className="core flex flex-col gap-3 rounded-[calc(1.75rem-0.5rem)] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(10,92,255,0.5)]">
                {inicial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {sesion?.nombre ?? "…"}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  {sesion?.rol ?? ""}
                </p>
              </div>
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
    </>
  );
}
