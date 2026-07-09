import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type Audiencia = "TODOS" | "VENDEDORES" | "ADMINS" | "PRIVADO";

export type NotificacionDoc = {
  id: string;
  tipo: "AVISO" | "ACTIVIDAD" | "ACTUALIZACION";
  audiencia: Audiencia;
  destinatarios: string[];
  mensaje: string;
  autor: string;
  autorRol: string;
  clienteId: string | null;
  clienteNombre: string | null;
  fecha: Timestamp | null;
  leidoPor: string[];
};

const notificacionesRef = collection(db, "notificaciones");

function esRelevante(n: NotificacionDoc, sesion: { nombre: string; rol: string }): boolean {
  // Un aviso nunca debe aparecer en la bandeja de quien lo envió (se compara
  // también el rol para no ocultarle notificaciones legítimas a alguien que
  // por coincidencia comparta nombre con una persona de otro rol).
  if (n.autor === sesion.nombre && n.autorRol === sesion.rol) return false;
  if (n.audiencia === "TODOS") return true;
  if (n.audiencia === "PRIVADO") return n.destinatarios.includes(sesion.nombre);
  if (n.audiencia === "VENDEDORES") return sesion.rol === "VENDEDOR";
  if (n.audiencia === "ADMINS") return sesion.rol === "ADMIN";
  return false;
}

export function suscribirNotificaciones(
  sesion: { nombre: string; rol: string },
  callback: (notificaciones: NotificacionDoc[]) => void
) {
  const q = query(notificacionesRef, orderBy("fecha", "desc"), limit(100));
  return onSnapshot(q, (snap) => {
    const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificacionDoc);
    callback(todas.filter((n) => esRelevante(n, sesion)));
  });
}

export async function crearAviso(
  autor: { nombre: string; rol: string },
  audiencia: "TODOS" | "PRIVADO",
  destinatarios: string[],
  mensaje: string
) {
  const limpio = mensaje.trim();
  if (!limpio) return;

  await addDoc(notificacionesRef, {
    tipo: "AVISO",
    audiencia,
    destinatarios: audiencia === "PRIVADO" ? destinatarios : [],
    mensaje: limpio,
    autor: autor.nombre,
    autorRol: autor.rol,
    clienteId: null,
    clienteNombre: null,
    fecha: serverTimestamp(),
    leidoPor: [],
  });
}

export async function crearNotificacionActividad(
  autor: { nombre: string; rol: string },
  mensaje: string,
  clienteId?: string | null,
  clienteNombre?: string | null
) {
  if (autor.rol !== "VENDEDOR") return;

  await addDoc(notificacionesRef, {
    tipo: "ACTIVIDAD",
    audiencia: "ADMINS",
    destinatarios: [],
    mensaje,
    autor: autor.nombre,
    autorRol: autor.rol,
    clienteId: clienteId ?? null,
    clienteNombre: clienteNombre ?? null,
    fecha: serverTimestamp(),
    leidoPor: [],
  });
}

// Avisos de "actualización de la plataforma": solo para admins, y a
// diferencia de un AVISO normal, se muestran como ventana emergente
// automática al entrar (no solo en la campanita). Se disparan a mano
// cuando el dueño decide anunciar un cambio (o varios juntos).
export async function crearAvisoActualizacion(mensaje: string) {
  const limpio = mensaje.trim();
  if (!limpio) return;

  await addDoc(notificacionesRef, {
    tipo: "ACTUALIZACION",
    audiencia: "ADMINS",
    destinatarios: [],
    mensaje: limpio,
    autor: "Actualización de la plataforma",
    autorRol: "SISTEMA",
    clienteId: null,
    clienteNombre: null,
    fecha: serverTimestamp(),
    leidoPor: [],
  });
}

export function suscribirAvisosEnviados(callback: (avisos: NotificacionDoc[]) => void) {
  const q = query(notificacionesRef, orderBy("fecha", "desc"), limit(100));
  return onSnapshot(q, (snap) => {
    const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificacionDoc);
    callback(todas.filter((n) => n.tipo === "AVISO"));
  });
}

export async function marcarNotificacionLeida(id: string, leidoPor: string[], nombre: string) {
  if (leidoPor.includes(nombre)) return;
  await updateDoc(doc(db, "notificaciones", id), {
    leidoPor: arrayUnion(nombre),
  });
}
