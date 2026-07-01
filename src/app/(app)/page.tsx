"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { suscribirClientes, ClienteDoc } from "@/lib/clientesService";
import { estadoActual, diasRestantes } from "@/lib/membership";
import { StatusBadge } from "@/components/StatusBadge";
import { ESTADOS_CLIENTE } from "@/lib/constants";
import { Users, UserPlus, ShieldCheck, AlertTriangle, ArrowUpRight, Radio } from "lucide-react";

export default function DashboardPage() {
  const [clientes, setClientes] = useState<ClienteDoc[] | null>(null);

  useEffect(() => {
    const unsub = suscribirClientes(setClientes);
    return () => unsub();
  }, []);

  if (clientes === null) {
    return <div className="py-16 text-center text-sm text-muted">Cargando clientes…</div>;
  }

  const conEstado = clientes.map((c) => ({ ...c, estadoCalculado: estadoActual(c) }));

  const total = conEstado.length;
  const activos = conEstado.filter((c) => c.estadoCalculado === ESTADOS_CLIENTE.ACTIVO).length;
  const porVencer = conEstado.filter(
    (c) =>
      c.estadoCalculado === ESTADOS_CLIENTE.ACTIVO &&
      (diasRestantes(c.fechaVencimiento) ?? 999) <= 30
  ).length;
  const nuevos = conEstado.filter((c) => c.estadoCalculado === ESTADOS_CLIENTE.NUEVO).length;

  const stats = [
    { label: "Clientes totales", value: total, icon: Users },
    { label: "Membresías activas", value: activos, icon: ShieldCheck },
    { label: "Por vencer (30 días)", value: porVencer, icon: AlertTriangle },
    { label: "Nuevos sin invitar", value: nuevos, icon: UserPlus },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          <Radio className="h-3 w-3 animate-pulse" strokeWidth={2} />
          Panel general · en vivo
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Clientes de la certificación
        </h1>
        <p className="text-sm text-muted">
          Control de invitaciones y membresías anuales de Legendar-IA.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="shell rounded-[1.75rem] p-2 diffused">
            <div className="core flex flex-col gap-3 rounded-[calc(1.75rem-0.5rem)] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core rounded-[calc(2rem-0.5rem)] p-2 md:p-3">
          {conEstado.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p className="text-sm text-muted">Todavía no hay clientes registrados.</p>
              <Link
                href="/clientes/nuevo"
                className="group flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98]"
              >
                <span className="py-2">Registrar el primero</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-silver">
              {conEstado.map((cliente) => {
                const dias = diasRestantes(cliente.fechaVencimiento);
                return (
                  <li key={cliente.id}>
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="group flex items-center justify-between gap-4 rounded-2xl px-4 py-4 transition-colors duration-300 hover:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {cliente.nombre}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {cliente.email || "Sin correo"} · Agregado por:{" "}
                          {cliente.creadoPor}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-3">
                        {cliente.estadoCalculado === ESTADOS_CLIENTE.ACTIVO &&
                          dias !== null && (
                            <span className="hidden text-xs text-muted sm:inline">
                              {dias > 0 ? `${dias} días restantes` : "Vence hoy"}
                            </span>
                          )}
                        <StatusBadge estado={cliente.estadoCalculado} />
                        <ArrowUpRight
                          className="h-4 w-4 text-muted transition-transform duration-500 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          strokeWidth={1.5}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
