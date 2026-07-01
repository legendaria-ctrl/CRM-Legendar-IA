import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { ESTADOS_CLIENTE, TIPOS_EVENTO } from "./constants";
import { fechaVencimientoDesde } from "./membership";
import { registrarActividad } from "./activityService";

export type Autor = { nombre: string; rol: string };

export type ClienteDoc = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  estado: string;
  notas: string | null;
  region: string | null;
  fechaLlegada: Timestamp | null;
  fechaInvitacion: Timestamp | null;
  fechaAceptacion: Timestamp | null;
  fechaVencimiento: Timestamp | null;
  mensajeBienvenida: boolean;
  creadoPor: string;
  creadoPorRol: string;
};

export type EventoDoc = {
  id: string;
  tipo: string;
  fecha: Timestamp | null;
  nota: string | null;
  autor: string;
};

const clientesRef = collection(db, "clientes");

export function suscribirClientes(callback: (clientes: ClienteDoc[]) => void) {
  const q = query(clientesRef, orderBy("fechaLlegada", "desc"));
  return onSnapshot(q, (snap) => {
    const clientes = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClienteDoc);
    callback(clientes);
  });
}

export function suscribirCliente(id: string, callback: (cliente: ClienteDoc | null) => void) {
  return onSnapshot(doc(db, "clientes", id), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as ClienteDoc);
  });
}

export function suscribirEventos(clienteId: string, callback: (eventos: EventoDoc[]) => void) {
  const q = query(collection(db, "clientes", clienteId, "eventos"), orderBy("fecha", "asc"));
  return onSnapshot(q, (snap) => {
    const eventos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventoDoc);
    callback(eventos);
  });
}

async function agregarEvento(
  clienteId: string,
  clienteNombre: string,
  tipo: string,
  autor: Autor,
  nota?: string | null
) {
  await Promise.all([
    addDoc(collection(db, "clientes", clienteId, "eventos"), {
      tipo,
      nota: nota || null,
      autor: autor.nombre,
      fecha: serverTimestamp(),
    }),
    registrarActividad({
      clienteId,
      clienteNombre,
      accion: tipo,
      autor: autor.nombre,
      autorRol: autor.rol,
      nota: nota || null,
    }),
  ]);
}

export async function crearCliente(input: {
  nombre: string;
  email?: string;
  telefono?: string;
  notas?: string;
  region?: string;
  fechaInscripcion?: Date;
  mensajeBienvenida?: boolean;
  autor: string;
  autorRol: string;
  origen?: "manual" | "csv";
}) {
  const nuevo = await addDoc(clientesRef, {
    nombre: input.nombre,
    email: input.email || null,
    telefono: input.telefono || null,
    notas: input.notas || null,
    region: input.region || null,
    estado: ESTADOS_CLIENTE.NUEVO,
    fechaLlegada: input.fechaInscripcion
      ? Timestamp.fromDate(input.fechaInscripcion)
      : serverTimestamp(),
    fechaInvitacion: null,
    fechaAceptacion: null,
    fechaVencimiento: null,
    mensajeBienvenida: input.mensajeBienvenida ?? false,
    creadoPor: input.autor,
    creadoPorRol: input.autorRol,
  });

  const esImportacion = input.origen === "csv";

  await agregarEvento(
    nuevo.id,
    input.nombre,
    esImportacion ? TIPOS_EVENTO.IMPORTACION : TIPOS_EVENTO.LLEGADA,
    { nombre: input.autor, rol: input.autorRol },
    esImportacion ? "Cliente importado desde un archivo CSV" : "Cliente registrado en el CRM"
  );

  return nuevo.id;
}

export async function enviarInvitacion(clienteId: string, clienteNombre: string, autor: Autor) {
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.INVITACION_ENVIADA,
    fechaInvitacion: serverTimestamp(),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.INVITACION_ENVIADA,
    autor,
    "Invitación enviada al cliente"
  );
}

export async function deshacerInvitacion(clienteId: string, clienteNombre: string, autor: Autor) {
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.NUEVO,
    fechaInvitacion: null,
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.RESTAURACION,
    autor,
    "Se deshizo el envío de la invitación. El cliente vuelve a estado Nuevo."
  );
}

export async function aceptarInvitacion(clienteId: string, clienteNombre: string, autor: Autor) {
  const ahora = new Date();
  const vencimiento = fechaVencimientoDesde(ahora);
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.ACTIVO,
    fechaAceptacion: Timestamp.fromDate(ahora),
    fechaVencimiento: Timestamp.fromDate(vencimiento),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.INVITACION_ACEPTADA,
    autor,
    "El cliente aceptó la invitación. Membresía activada por 1 año."
  );
}

export async function deshacerAceptacion(clienteId: string, clienteNombre: string, autor: Autor) {
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.INVITACION_ENVIADA,
    fechaAceptacion: null,
    fechaVencimiento: null,
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.RESTAURACION,
    autor,
    "Se deshizo la aceptación de la invitación. El cliente vuelve a Invitación enviada."
  );
}

export async function renovarMembresia(clienteId: string, clienteNombre: string, autor: Autor) {
  const ahora = new Date();
  const vencimiento = fechaVencimientoDesde(ahora);
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.ACTIVO,
    fechaAceptacion: Timestamp.fromDate(ahora),
    fechaVencimiento: Timestamp.fromDate(vencimiento),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.RENOVACION,
    autor,
    "Membresía renovada por 1 año más."
  );
}

export async function agregarNota(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  nota: string
) {
  await agregarEvento(clienteId, clienteNombre, TIPOS_EVENTO.NOTA, autor, nota);
}

export async function actualizarMensajeBienvenida(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  enviado: boolean
) {
  await updateDoc(doc(db, "clientes", clienteId), { mensajeBienvenida: enviado });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.MENSAJE_BIENVENIDA,
    autor,
    enviado ? "Mensaje de bienvenida marcado como enviado" : "Mensaje de bienvenida desmarcado"
  );
}

export async function eliminarCliente(clienteId: string, clienteNombre: string, autor: Autor) {
  await registrarActividad({
    clienteId,
    clienteNombre,
    accion: TIPOS_EVENTO.ELIMINACION,
    autor: autor.nombre,
    autorRol: autor.rol,
    nota: `Cliente "${clienteNombre}" eliminado del CRM`,
  });

  const eventosSnap = await getDocs(collection(db, "clientes", clienteId, "eventos"));
  await Promise.all(eventosSnap.docs.map((d) => deleteDoc(d.ref)));

  await deleteDoc(doc(db, "clientes", clienteId));
}

export async function obtenerContactosPorIds(
  ids: string[]
): Promise<Record<string, { email: string | null; telefono: string | null; notas: string | null }>> {
  const unicos = Array.from(new Set(ids));
  const entradas = await Promise.all(
    unicos.map(async (id) => {
      const snap = await getDoc(doc(db, "clientes", id));
      const data = snap.data() as ClienteDoc | undefined;
      return [
        id,
        {
          email: data?.email ?? null,
          telefono: data?.telefono ?? null,
          notas: data?.notas ?? null,
        },
      ] as const;
    })
  );
  return Object.fromEntries(entradas);
}
