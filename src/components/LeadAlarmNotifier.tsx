"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { suscribirClientes, ClienteDoc } from "@/lib/clientesService";
import { calcularSlaLead } from "@/lib/leadSla";
import { aFecha } from "@/lib/membership";
import { useSesion } from "@/lib/session-context";

// Componente invisible, montado una sola vez en el layout: mientras el
// vendedor tenga esta pestaña abierta (en compu o celular), avisa con una
// notificación nativa del navegador 30 min antes de que suene una alarma de
// seguimiento programada en alguno de sus leads. No requiere backend: se
// recalcula solo, en el propio navegador, con lo que ya llega por Firestore.
export function LeadAlarmNotifier() {
  const { sesion } = useSesion();
  const router = useRouter();
  const notificadosRef = useRef<Set<string>>(new Set());
  const clientesRef = useRef<ClienteDoc[]>([]);

  useEffect(() => {
    if (!sesion) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [sesion]);

  useEffect(() => {
    if (!sesion) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const nombreVendedor = sesion.nombre;

    function revisar() {
      const propios = clientesRef.current.filter((c) => c.vendedor === nombreVendedor);

      for (const c of propios) {
        const sla = calcularSlaLead({
          estado: c.estado,
          fechaAsignacion: aFecha(c.fechaAsignacion),
          alarmaFecha: aFecha(c.alarmaFecha),
          alarmaAnticipacionMin: c.alarmaAnticipacionMin,
        });

        // Clave única por lead+alarma: si reprograma la alarma, puede
        // volver a avisar; si ya notificó esta alarma exacta, no repite.
        const clave = `${c.id}:${sla.alarmaFecha?.getTime() ?? ""}`;

        if (sla.proximaAlarma && !notificadosRef.current.has(clave)) {
          notificadosRef.current.add(clave);
          if (Notification.permission === "granted") {
            const n = new Notification("Alarma de seguimiento", {
              body: `${c.nombre} — te toca hablarle pronto${c.alarmaNota ? `: ${c.alarmaNota}` : ""}`,
              tag: clave,
            });
            n.onclick = () => {
              window.focus();
              router.push(`/clientes/${c.id}`);
            };
          }
        }

        if (sla.estadoSla !== "pausado_alarma") {
          notificadosRef.current.delete(clave);
        }
      }
    }

    const unsub = suscribirClientes((clientes) => {
      clientesRef.current = clientes;
      revisar();
    });
    const id = setInterval(revisar, 30000);
    return () => {
      unsub();
      clearInterval(id);
    };
  }, [sesion, router]);

  return null;
}
