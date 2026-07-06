import {
  addDoc,
  arrayRemove,
  arrayUnion,
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
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  ESTADOS_CLIENTE,
  ESTADOS_BIENVENIDA,
  EstadoBienvenida,
  TIPOS_EVENTO,
  PAPELERA_DIAS,
} from "./constants";
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
  mensajeBienvenida: EstadoBienvenida | boolean;
  pausada: boolean;
  fechaPausa: Timestamp | null;
  tags: string[];
  etiquetas: string[];
  vendedor: string | null;
  creadoPor: string;
  creadoPorRol: string;
  eliminado: boolean;
  fechaEliminacion: Timestamp | null;
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
  tags?: string[];
  etiquetas?: string[];
  vendedor?: string;
  autor: string;
  autorRol: string;
  origen?: "manual" | "csv";
}) {
  const fechaLlegada = input.fechaInscripcion ?? new Date();
  const vencimiento = fechaVencimientoDesde(fechaLlegada);

  const nuevo = await addDoc(clientesRef, {
    nombre: input.nombre,
    email: input.email || null,
    telefono: input.telefono || null,
    notas: input.notas || null,
    region: input.region || null,
    estado: ESTADOS_CLIENTE.NUEVO,
    fechaLlegada: Timestamp.fromDate(fechaLlegada),
    fechaInvitacion: null,
    fechaAceptacion: null,
    fechaVencimiento: Timestamp.fromDate(vencimiento),
    mensajeBienvenida: input.mensajeBienvenida
      ? ESTADOS_BIENVENIDA.ENVIADA
      : ESTADOS_BIENVENIDA.PENDIENTE,
    pausada: false,
    fechaPausa: null,
    tags: input.tags?.length ? Array.from(new Set(input.tags)) : [],
    etiquetas: input.etiquetas?.length ? Array.from(new Set(input.etiquetas)) : [],
    vendedor: input.vendedor?.trim() || null,
    creadoPor: input.autor,
    creadoPorRol: input.autorRol,
    eliminado: false,
    fechaEliminacion: null,
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
    fechaInvitacion: Timestamp.fromDate(new Date()),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.INVITACION_ENVIADA,
    autor,
    "Invitación enviada al cliente."
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
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.ACTIVO,
    fechaAceptacion: Timestamp.fromDate(new Date()),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.INVITACION_ACEPTADA,
    autor,
    "El cliente aceptó la invitación."
  );
}

export async function deshacerAceptacion(clienteId: string, clienteNombre: string, autor: Autor) {
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.INVITACION_ENVIADA,
    fechaAceptacion: null,
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.RESTAURACION,
    autor,
    "Se deshizo la aceptación de la invitación. El cliente vuelve a Invitación enviada."
  );
}

export async function pausarMembresia(clienteId: string, clienteNombre: string, autor: Autor) {
  await updateDoc(doc(db, "clientes", clienteId), {
    pausada: true,
    fechaPausa: Timestamp.fromDate(new Date()),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.PAUSA,
    autor,
    "Se pausó el temporizador de la membresía."
  );
}

export async function reanudarMembresia(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  fechaVencimientoActual: Date,
  fechaPausaActual: Date
) {
  const ahora = new Date();
  const msPausada = ahora.getTime() - fechaPausaActual.getTime();
  const nuevoVencimiento = new Date(fechaVencimientoActual.getTime() + msPausada);
  await updateDoc(doc(db, "clientes", clienteId), {
    pausada: false,
    fechaPausa: null,
    fechaVencimiento: Timestamp.fromDate(nuevoVencimiento),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.REANUDACION,
    autor,
    "Se reanudó el temporizador de la membresía."
  );
}

export async function agregarDiasMembresia(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  fechaVencimientoActual: Date,
  dias: number
) {
  const nuevoVencimiento = new Date(fechaVencimientoActual);
  nuevoVencimiento.setDate(nuevoVencimiento.getDate() + dias);
  await updateDoc(doc(db, "clientes", clienteId), {
    fechaVencimiento: Timestamp.fromDate(nuevoVencimiento),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.EXTENSION,
    autor,
    `Se agregaron ${dias} días a la membresía.`
  );
}

export async function renovarMembresia(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  fechaVencimientoActual: Date
) {
  const ahora = new Date();
  const nuevoVencimiento = fechaVencimientoDesde(fechaVencimientoActual);
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.ACTIVO,
    fechaVencimiento: Timestamp.fromDate(nuevoVencimiento),
    pausada: false,
    fechaPausa: null,
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.RENOVACION,
    autor,
    `Membresía renovada por 1 año más (se sumaron 365 días a lo que quedaba). Renovada el ${ahora.toLocaleDateString("es-MX")}.`
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

const BIENVENIDA_NOTA: Record<EstadoBienvenida, string> = {
  PENDIENTE: "Mensaje de bienvenida marcado como pendiente",
  ENVIADA: "Mensaje de bienvenida marcado como enviado",
  INVALIDO: "Mensaje de bienvenida marcado como número inválido",
};

export async function actualizarMensajeBienvenida(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  estado: EstadoBienvenida
) {
  await updateDoc(doc(db, "clientes", clienteId), { mensajeBienvenida: estado });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.MENSAJE_BIENVENIDA,
    autor,
    BIENVENIDA_NOTA[estado]
  );
}

export async function agregarTagsCliente(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  tags: string[]
) {
  const unicos = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  if (unicos.length === 0) return;
  await updateDoc(doc(db, "clientes", clienteId), { tags: arrayUnion(...unicos) });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.TAGS,
    autor,
    `Se agregaron tags: ${unicos.join(", ")}`
  );
}

export async function agregarEtiquetasCliente(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  etiquetas: string[]
) {
  const unicas = Array.from(new Set(etiquetas.map((e) => e.trim()).filter(Boolean)));
  if (unicas.length === 0) return;
  await updateDoc(doc(db, "clientes", clienteId), { etiquetas: arrayUnion(...unicas) });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.ETIQUETAS,
    autor,
    `Se agregó a la(s) certificación(es): ${unicas.join(", ")}`
  );
}

export async function quitarTagCliente(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  tag: string
) {
  await updateDoc(doc(db, "clientes", clienteId), { tags: arrayRemove(tag) });
  await agregarEvento(clienteId, clienteNombre, TIPOS_EVENTO.TAGS, autor, `Se quitó la etiqueta: ${tag}`);
}

export async function quitarEtiquetaCliente(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  etiqueta: string
) {
  await updateDoc(doc(db, "clientes", clienteId), { etiquetas: arrayRemove(etiqueta) });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.ETIQUETAS,
    autor,
    `Se quitó de la certificación: ${etiqueta}`
  );
}

export async function actualizarDatosCliente(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  cambios: {
    nombre: string;
    email?: string;
    telefono?: string;
    region?: string;
    notas?: string;
  }
) {
  await updateDoc(doc(db, "clientes", clienteId), {
    nombre: cambios.nombre,
    email: cambios.email || null,
    telefono: cambios.telefono || null,
    region: cambios.region || null,
    notas: cambios.notas || null,
  });
  await agregarEvento(
    clienteId,
    cambios.nombre,
    TIPOS_EVENTO.EDICION,
    autor,
    "Se editaron los datos del cliente."
  );
}

export async function actualizarVendedor(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  vendedor: string | null
) {
  await updateDoc(doc(db, "clientes", clienteId), { vendedor });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.VENDEDOR,
    autor,
    vendedor ? `Vendedor asignado: ${vendedor}` : "Se quitó el vendedor asignado"
  );
}

// Envía al cliente a la papelera (borrado suave). Se conserva toda su
// información y su línea de tiempo por PAPELERA_DIAS días, durante los
// cuales se puede restaurar tal como estaba o eliminar definitivamente.
export async function eliminarCliente(clienteId: string, clienteNombre: string, autor: Autor) {
  await updateDoc(doc(db, "clientes", clienteId), {
    eliminado: true,
    fechaEliminacion: Timestamp.fromDate(new Date()),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.PAPELERA,
    autor,
    `Cliente enviado a la papelera. Se eliminará definitivamente en ${PAPELERA_DIAS} días si nadie lo restaura.`
  );
}

export async function restaurarClienteDePapelera(
  clienteId: string,
  clienteNombre: string,
  autor: Autor
) {
  await updateDoc(doc(db, "clientes", clienteId), {
    eliminado: false,
    fechaEliminacion: null,
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.RESTAURACION_PAPELERA,
    autor,
    "Cliente restaurado desde la papelera, tal como estaba."
  );
}

// Borrado permanente e irreversible: elimina el cliente y toda su línea de
// tiempo. Solo debe ofrecerse desde la papelera (nunca desde la ficha).
export async function eliminarClientePermanente(
  clienteId: string,
  clienteNombre: string,
  autor: Autor
) {
  await registrarActividad({
    clienteId,
    clienteNombre,
    accion: TIPOS_EVENTO.ELIMINACION_PERMANENTE,
    autor: autor.nombre,
    autorRol: autor.rol,
    nota: `Cliente "${clienteNombre}" eliminado definitivamente de la papelera`,
  });

  const eventosSnap = await getDocs(collection(db, "clientes", clienteId, "eventos"));
  await Promise.all(eventosSnap.docs.map((d) => deleteDoc(d.ref)));

  await deleteDoc(doc(db, "clientes", clienteId));
}

export function suscribirPapelera(callback: (clientes: ClienteDoc[]) => void) {
  // Filtra en el servidor (en vez de traer toda la colección y filtrar aquí)
  // para no leer de más cada vez que cambia cualquier cliente.
  const q = query(clientesRef, where("eliminado", "==", true));
  return onSnapshot(q, (snap) => {
    const clientes = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClienteDoc);
    callback(clientes);
  });
}

export async function obtenerContactosPorIds(
  ids: string[]
): Promise<
  Record<
    string,
    {
      email: string | null;
      telefono: string | null;
      notas: string | null;
      vendedor: string | null;
      etiquetas: string[];
    }
  >
> {
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
          vendedor: data?.vendedor ?? null,
          etiquetas: data?.etiquetas ?? [],
        },
      ] as const;
    })
  );
  return Object.fromEntries(entradas);
}
