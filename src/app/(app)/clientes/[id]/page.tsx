"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { suscribirCliente, suscribirEventos, ClienteDoc, EventoDoc } from "@/lib/clientesService";
import { estadoActual, aFecha } from "@/lib/membership";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ClientActions } from "@/components/ClientActions";
import { Mail, Phone, User } from "lucide-react";

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
            </div>
            {cliente.notas && (
              <p className="mt-3 max-w-xl text-sm text-muted">{cliente.notas}</p>
            )}
          </div>
        </div>
      </div>

      <ClientActions clienteId={cliente.id} estado={estado} />

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
