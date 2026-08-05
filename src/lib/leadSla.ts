import { Timestamp } from "firebase/firestore";
import {
  ESTADOS_CLIENTE,
  LEAD_SLA_HORAS,
  LEAD_SLA_ALERTA_HORAS,
  LEAD_SLA_ALARMA_ANTICIPACION_MIN_DEFAULT,
} from "./constants";

function aMs(valor: Timestamp | Date | null | undefined): number | null {
  if (!valor) return null;
  if (valor instanceof Timestamp) return valor.toMillis();
  return valor.getTime();
}

export type EstadoSlaLead = "sin_reloj" | "pausado_alarma" | "normal" | "alerta" | "vencido";

export type InfoSlaLead = {
  estadoSla: EstadoSlaLead;
  /** Punto de partida efectivo del conteo de 48h (asignación o, si ya pasó, la alarma). */
  inicio: Date | null;
  limite: Date | null;
  /** Dentro de los 30 min previos a que suene la alarma programada. */
  proximaAlarma: boolean;
  alarmaFecha: Date | null;
};

const SIN_RELOJ: InfoSlaLead = {
  estadoSla: "sin_reloj",
  inicio: null,
  limite: null,
  proximaAlarma: false,
  alarmaFecha: null,
};

// Calcula en qué punto del SLA de 48h está un lead, de forma puramente
// derivada de los campos guardados (sin jobs de fondo): si hay una alarma
// futura, el reloj está en pausa; si ya pasó, el reloj arranca desde ahí.
export function calcularSlaLead(
  cliente: {
    estado: string;
    fechaAsignacion?: Timestamp | Date | null;
    alarmaFecha?: Timestamp | Date | null;
    alarmaAnticipacionMin?: number | null;
  },
  ahora: number = Date.now()
): InfoSlaLead {
  if (cliente.estado !== ESTADOS_CLIENTE.SEGUIMIENTO) return SIN_RELOJ;

  const alarmaMs = aMs(cliente.alarmaFecha);
  const asignacionMs = aMs(cliente.fechaAsignacion);
  const anticipacionMs =
    (cliente.alarmaAnticipacionMin ?? LEAD_SLA_ALARMA_ANTICIPACION_MIN_DEFAULT) * 60 * 1000;

  if (alarmaMs && alarmaMs > ahora) {
    return {
      estadoSla: "pausado_alarma",
      inicio: null,
      limite: null,
      proximaAlarma: alarmaMs - ahora <= anticipacionMs,
      alarmaFecha: new Date(alarmaMs),
    };
  }

  const inicioMs = alarmaMs ?? asignacionMs;
  if (!inicioMs) return SIN_RELOJ;

  const limiteMs = inicioMs + LEAD_SLA_HORAS * 60 * 60 * 1000;
  const alertaMs = inicioMs + LEAD_SLA_ALERTA_HORAS * 60 * 60 * 1000;

  let estadoSla: EstadoSlaLead = "normal";
  if (ahora >= limiteMs) estadoSla = "vencido";
  else if (ahora >= alertaMs) estadoSla = "alerta";

  return {
    estadoSla,
    inicio: new Date(inicioMs),
    limite: new Date(limiteMs),
    proximaAlarma: false,
    alarmaFecha: alarmaMs ? new Date(alarmaMs) : null,
  };
}
