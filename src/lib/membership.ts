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
}): EstadoCliente {
  const aceptacion = aFecha(cliente.fechaAceptacion);
  const vencimiento = aFecha(cliente.fechaVencimiento);

  if (vencimiento && aceptacion) {
    if (new Date() > vencimiento) return ESTADOS_CLIENTE.VENCIDO;
    return ESTADOS_CLIENTE.ACTIVO;
  }
  return cliente.estado as EstadoCliente;
}

export function diasRestantes(fechaVencimiento: Timestamp | Date | null): number | null {
  const vencimiento = aFecha(fechaVencimiento);
  if (!vencimiento) return null;
  const ms = vencimiento.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function porcentajeTranscurrido(
  fechaAceptacion: Timestamp | Date | null,
  fechaVencimiento: Timestamp | Date | null
): number {
  const aceptacion = aFecha(fechaAceptacion);
  const vencimiento = aFecha(fechaVencimiento);
  if (!aceptacion || !vencimiento) return 0;
  const total = vencimiento.getTime() - aceptacion.getTime();
  const transcurrido = Date.now() - aceptacion.getTime();
  return Math.min(100, Math.max(0, (transcurrido / total) * 100));
}
