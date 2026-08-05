"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldAlert, DollarSign, ArrowUpRight, Pencil, UserX } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import { suscribirClientes, actualizarVendedor, ClienteDoc } from "@/lib/clientesService";
import { ESTADOS_CLIENTE, EstadoCliente } from "@/lib/constants";
import { aFecha } from "@/lib/membership";
import { calcularSlaLead } from "@/lib/leadSla";
import { StatusBadge } from "@/components/StatusBadge";
import { VendedorSelect } from "@/components/VendedorSelect";

export default function PendientesPage() {
  const { sesion, cargando } = useSesion();
  const [clientes, setClientes] = useState<ClienteDoc[] | null>(null);

  useEffect(() => {
    if (sesion?.rol !== "ADMIN") return;
    const unsub = suscribirClientes(setClientes);
    return () => unsub();
  }, [sesion?.rol]);

  const pendientes = useMemo(
    () => (clientes ?? []).filter((c) => c.estado === ESTADOS_CLIENTE.PENDIENTE_AUTORIZACION),
    [clientes]
  );

  const perdidos = useMemo(
    () =>
      (clientes ?? []).filter((c) => {
        if (c.estado !== ESTADOS_CLIENTE.SEGUIMIENTO) return false;
        const sla = calcularSlaLead({
          estado: c.estado,
          fechaAsignacion: aFecha(c.fechaAsignacion),
          alarmaFecha: aFecha(c.alarmaFecha),
          alarmaAnticipacionMin: c.alarmaAnticipacionMin,
        });
        return sla.estadoSla === "vencido";
      }),
    [clientes]
  );

  async function reasignar(cliente: ClienteDoc, vendedor: string | null) {
    if (!sesion) return;
    await actualizarVendedor(
      cliente.id,
      cliente.nombre,
      { nombre: sesion.nombre, rol: sesion.rol },
      vendedor,
      cliente.vendedor
    );
  }

  if (cargando) {
    return <div className="py-16 text-center text-sm text-muted">Cargando…</div>;
  }

  if (sesion?.rol !== "ADMIN") {
    return (
      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col items-center gap-3 rounded-[calc(2rem-0.5rem)] p-16 text-center">
          <ShieldAlert className="h-6 w-6 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-muted">
            Solo un administrador puede ver y autorizar clientes pendientes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pendientes de autorización
        </h1>
        <p className="text-sm text-muted">
          Clientes nuevos dados de alta por vendedores y seguimientos ya enviados a revisión.
          Edítalos si hace falta y autorízalos para enviarles la invitación.
        </p>
      </div>

      {clientes === null && (
        <p className="py-10 text-center text-sm text-muted">Cargando pendientes…</p>
      )}

      {clientes !== null && pendientes.length === 0 && (
        <p className="rounded-2xl border border-dashed border-silver-deep/60 px-4 py-10 text-center text-sm text-muted">
          No hay clientes pendientes de autorización.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {pendientes.map((c) => (
          <Link
            key={c.id}
            href={`/clientes/${c.id}`}
            className="shell rounded-[1.75rem] p-2 diffused transition-transform duration-500 ease-spring hover:scale-[1.005]"
          >
            <div className="core flex flex-wrap items-center justify-between gap-3 rounded-[calc(1.75rem-0.5rem)] p-5">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <StatusBadge estado={c.estado as EstadoCliente} />
                  <span className="text-xs text-muted">
                    Dado de alta por {c.creadoPor} ({c.creadoPorRol})
                  </span>
                </div>
                <p className="truncate text-sm font-medium text-foreground">{c.nombre}</p>
                {c.vendedor && (
                  <p className="truncate text-xs text-muted">Vendedor: {c.vendedor}</p>
                )}
              </div>

              <div className="flex flex-none items-center gap-4">
                {c.monto && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <DollarSign className="h-3 w-3" strokeWidth={1.5} />
                    {c.monto}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full border border-silver-deep/60 px-3 py-1 text-xs font-medium text-muted">
                  <Pencil className="h-3 w-3" strokeWidth={2} />
                  Revisar
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted" strokeWidth={1.75} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Leads perdidos</h2>
        <p className="text-sm text-muted">
          Seguimientos que pasaron 48h sin contacto: el vendedor ya no puede tocarlos. Reasígnalos
          para que vuelvan a activarse.
        </p>
      </div>

      {clientes !== null && perdidos.length === 0 && (
        <p className="rounded-2xl border border-dashed border-silver-deep/60 px-4 py-10 text-center text-sm text-muted">
          No hay leads perdidos por ahora.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {perdidos.map((c) => (
          <div
            key={c.id}
            className="shell rounded-[1.75rem] p-2 diffused"
          >
            <div className="core flex flex-wrap items-center justify-between gap-3 rounded-[calc(1.75rem-0.5rem)] p-5">
              <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <StatusBadge estado={c.estado as EstadoCliente} />
                  <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-1 text-[11px] font-medium text-danger">
                    <UserX className="h-3 w-3" strokeWidth={2} />
                    SLA vencido
                  </span>
                </div>
                <p className="truncate text-sm font-medium text-foreground">{c.nombre}</p>
                {c.vendedor && (
                  <p className="truncate text-xs text-muted">Se le perdió a: {c.vendedor}</p>
                )}
              </Link>

              <div className="flex flex-none items-center gap-3">
                <VendedorSelect
                  valor={c.vendedor}
                  onChange={(vendedor) => reasignar(c, vendedor)}
                  compacto
                  placeholder="Reasignar a…"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
