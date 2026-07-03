import { Timestamp } from "firebase/firestore";
import { ESTADOS_CLIENTE, EstadoCliente, MEMBRESIA_DIAS } from "./constants";

export function fechaVencimientoDesde(fechaAceptacion: Date): Date {
  const vencimiento = new Date(fechaAceptacion);
  vencimiento.setDate(vencimiento.getDate() + MEMBRESIA_DIAS);
  return vencimiento;
}

export function aFecha(valor: Timestamp | Date | null | undefined): Date | null {
  if (!valor) return null;
  if (valor instanceof Timestamp) return valor.toDate();
  return valor;
}

export function estadoActual(cliente: {
  estado: string;
  fechaAceptacion: Timestamp | Date | null;
  fechaVencimiento: Timestamp | Date | null;
  pausada?: boolean;
}): EstadoCliente {
  const aceptacion = aFecha(cliente.fechaAceptacion);
  const vencimiento = aFecha(cliente.fechaVencimiento);

  if (vencimiento && aceptacion && !cliente.pausada) {
    if (new Date() > vencimiento) return ESTADOS_CLIENTE.VENCIDO;
    return ESTADOS_CLIENTE.ACTIVO;
  }
  return cliente.estado as EstadoCliente;
}

// Para el indicador Activo/Inactivo de la lista: activo desde que se envía
// la invitación (arranca el temporizador) mientras no venza ni esté pausada,
// sin esperar a que el cliente acepte.
export function estaActivo(cliente: {
  fechaVencimiento: Timestamp | Date | null;
  pausada?: boolean;
}): boolean {
  const vencimiento = aFecha(cliente.fechaVencimiento);
  if (!vencimiento || cliente.pausada) return false;
  return new Date() <= vencimiento;
}

export function diasRestantes(
  fechaVencimiento: Timestamp | Date | null,
  fechaPausa?: Timestamp | Date | null
): number | null {
  const vencimiento = aFecha(fechaVencimiento);
  if (!vencimiento) return null;
  const pausa = aFecha(fechaPausa ?? null);
  const ahora = pausa ? pausa.getTime() : Date.now();
  const ms = vencimiento.getTime() - ahora;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function porcentajeTranscurrido(
  fechaInicio: Timestamp | Date | null,
  fechaVencimiento: Timestamp | Date | null
): number {
  const inicio = aFecha(fechaInicio);
  const vencimiento = aFecha(fechaVencimiento);
  if (!inicio || !vencimiento) return 0;
  const total = vencimiento.getTime() - inicio.getTime();
  const transcurrido = Date.now() - inicio.getTime();
  return Math.min(100, Math.max(0, (transcurrido / total) * 100));
}
