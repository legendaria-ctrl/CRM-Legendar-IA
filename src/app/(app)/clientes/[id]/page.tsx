"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { suscribirCliente, suscribirEventos, ClienteDoc, EventoDoc } from "@/lib/clientesService";
import { estadoActual, aFecha } from "@/lib/membership";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ClientActions } from "@/components/ClientActions";
import { Mail, Phone, User, Ticket, Globe2 } from "lucide-react";
import { REGION_LABEL, Region, beneficiosDeRegion } from "@/lib/constants";

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [cliente, setCliente] = useState<ClienteDoc | null | undefined>(undefined);
  const [eventos, setEventos] = useState<EventoDoc[]>([]);

  useEffect(() => {
    const unsubCliente = suscribirCliente(id, setCliente);
    const unsubEventos = suscribirEventos(id, setEventos);
    return () => {
      unsubCliente();
      unsubEventos();
    };
  }, [id]);

  if (cliente === undefined) {
    return <div className="py-16 text-center text-sm text-muted">Cargando cliente…</div>;
  }

  if (cliente === null) {
    return <div className="py-16 text-center text-sm text-muted">Este cliente ya no existe.</div>;
  }

  const estado = estadoActual(cliente);
  const fechaAceptacion = aFecha(cliente.fechaAceptacion);
  const fechaVencimiento = aFecha(cliente.fechaVencimiento);
  const beneficios = beneficiosDeRegion(cliente.region);

  return (
    <div className="flex flex-col gap-6">
      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge estado={estado} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {cliente.nombre}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              {cliente.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {cliente.email}
                </span>
              )}
              {cliente.telefono && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {cliente.telefono}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" strokeWidth={1.5} />
                Agregado por: {cliente.creadoPor}
              </span>
              {cliente.region && (
                <span className="flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {REGION_LABEL[cliente.region as Region] ?? cliente.region}
                </span>
              )}
            </div>
            {cliente.notas && (
              <p className="mt-3 max-w-xl text-sm text-muted">{cliente.notas}</p>
            )}
          </div>
        </div>
      </div>

      {beneficios.length > 0 && (
        <div className="shell rounded-[2rem] p-2 diffused-lg">
          <div className="core flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] p-6">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.15em] text-muted">
              <Ticket className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Beneficios Synergy Unlimited
            </h3>
            <ul className="flex flex-col gap-2">
              {beneficios.map((b, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-primary-dim px-4 py-2.5 text-sm text-primary-deep"
                >
                  <span>{b.evento}</span>
                  <span className="font-medium">
                    {b.cantidad}x {b.tipo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ClientActions clienteId={cliente.id} clienteNombre={cliente.nombre} estado={estado} />

      {fechaAceptacion && fechaVencimiento && (
        <CountdownTimer
          fechaAceptacion={fechaAceptacion.toISOString()}
          fechaVencimiento={fechaVencimiento.toISOString()}
        />
      )}

      <Timeline
        eventos={eventos.map((e) => ({
          id: e.id,
          tipo: e.tipo,
          fecha: aFecha(e.fecha)?.toISOString() ?? null,
          nota: e.nota,
          autor: e.autor,
        }))}
      />
    </div>
  );
}
