import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
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
  monto: string | null;
  totalAbonado: number;
  fechaPrimerAbono: Timestamp | null;
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
  monto?: string;
  autor: string;
  autorRol: string;
  origen?: "manual" | "csv" | "sheet";
  estadoInicial?: string;
}) {
  const fechaLlegada = input.fechaInscripcion ?? new Date();
  const vencimiento = fechaVencimientoDesde(fechaLlegada);

  const nuevo = await addDoc(clientesRef, {
    nombre: input.nombre,
    email: input.email || null,
    telefono: input.telefono || null,
    notas: input.notas || null,
    region: input.region || null,
    estado: input.estadoInicial ?? ESTADOS_CLIENTE.NUEVO,
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
    monto: input.monto?.trim() || null,
    totalAbonado: 0,
    fechaPrimerAbono: null,
    creadoPor: input.autor,
    creadoPorRol: input.autorRol,
    eliminado: false,
    fechaEliminacion: null,
  });

  const notaOrigen =
    input.origen === "csv"
      ? "Cliente importado desde un archivo CSV"
      : input.origen === "sheet"
        ? "Cliente importado automáticamente desde la hoja de seguimiento de ventas"
        : "Cliente registrado en el CRM";

  await agregarEvento(
    nuevo.id,
    input.nombre,
    input.origen === "csv" || input.origen === "sheet"
      ? TIPOS_EVENTO.IMPORTACION
      : TIPOS_EVENTO.LLEGADA,
    { nombre: input.autor, rol: input.autorRol },
    notaOrigen
  );

  return nuevo.id;
}

export async function enviarInvitacion(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  clienteCorreo?: string | null
) {
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

  // Dispara la invitación real a la comunidad de Skool. No debe tumbar el
  // flujo si falla (ej. correo repetido en Skool); ya se registró en el CRM.
  if (clienteCorreo) {
    try {
      await dispararInvitacionSkool(clienteCorreo);
    } catch {
      // Ignorar: el CRM ya quedó marcado, solo falló el aviso a Skool.
    }
  }
}

// Registra un abono sobre el total de un seguimiento/pendiente y acumula el
// monto en totalAbonado (para calcular "restante" sin sumar el historial).
// El primer abono también marca fechaPrimerAbono: es el momento en que el
// seguimiento se convierte en "apartado" y arranca su cronómetro.
export async function registrarAbono(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  monto: number,
  nota?: string
) {
  const clienteRef = doc(db, "clientes", clienteId);
  const snap = await getDoc(clienteRef);
  const esPrimerAbono = ((snap.data() as ClienteDoc | undefined)?.totalAbonado ?? 0) === 0;

  const cambios: Record<string, unknown> = { totalAbonado: increment(monto) };
  if (esPrimerAbono) cambios.fechaPrimerAbono = serverTimestamp();

  await updateDoc(clienteRef, cambios);
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.ABONO,
    autor,
    `Abono de $${monto.toLocaleString("es-MX")}${nota ? ` — ${nota}` : ""}`
  );
}

export async function enviarAAutorizacion(clienteId: string, clienteNombre: string, autor: Autor) {
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.PENDIENTE_AUTORIZACION,
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.ENVIO_REVISION,
    autor,
    "Seguimiento enviado a revisión del administrador."
  );
}

// Aprueba un pendiente (seguimiento convertido o alta directa de vendedor):
// registra quién autorizó y reutiliza enviarInvitacion para dejarlo como
// cliente normal en INVITACION_ENVIADA y disparar la invitación real.
export async function autorizarCliente(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  clienteCorreo?: string | null
) {
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.AUTORIZACION,
    autor,
    `Autorizado por ${autor.nombre}.`
  );
  await enviarInvitacion(clienteId, clienteNombre, autor, clienteCorreo);
}

export async function marcarInvitacionEnviada(
  clienteId: string,
  clienteNombre: string,
  autor: Autor
) {
  await updateDoc(doc(db, "clientes", clienteId), {
    estado: ESTADOS_CLIENTE.INVITACION_ENVIADA,
    fechaInvitacion: Timestamp.fromDate(new Date()),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.INVITACION_ENVIADA,
    autor,
    "Invitación marcada como enviada (sin disparar el envío real a Skool)."
  );
}

async function dispararInvitacionSkool(correo: string) {
  const res = await fetch("/api/skool-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "No se pudo invitar a Skool");
  }
}

// Botón manual en el perfil: útil cuando se corrige el correo del cliente
// y hay que volver a mandarle el link de invitación de Skool.
export async function reenviarInvitacionSkool(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  correo: string
) {
  await dispararInvitacionSkool(correo);
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.INVITACION_ENVIADA,
    autor,
    `Se reenvió la invitación de Skool a ${correo}.`
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

export async function establecerDiasRestantes(
  clienteId: string,
  clienteNombre: string,
  autor: Autor,
  dias: number
) {
  const ahora = new Date();
  const nuevoVencimiento = new Date(ahora);
  nuevoVencimiento.setDate(nuevoVencimiento.getDate() + dias);
  await updateDoc(doc(db, "clientes", clienteId), {
    fechaVencimiento: Timestamp.fromDate(nuevoVencimiento),
  });
  await agregarEvento(
    clienteId,
    clienteNombre,
    TIPOS_EVENTO.EDICION,
    autor,
    `Se ajustó manualmente el tiempo restante de la membresía a ${dias} días.`
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
    monto?: string;
    fechaInicio?: string;
  }
) {
  const datos: Record<string, unknown> = {
    nombre: cambios.nombre,
    email: cambios.email || null,
    telefono: cambios.telefono || null,
    region: cambios.region || null,
    notas: cambios.notas || null,
    monto: cambios.monto || null,
  };

  if (cambios.fechaInicio) {
    const fechaLlegada = new Date(`${cambios.fechaInicio}T00:00:00`);
    datos.fechaLlegada = Timestamp.fromDate(fechaLlegada);
    datos.fechaVencimiento = Timestamp.fromDate(fechaVencimientoDesde(fechaLlegada));
  }

  await updateDoc(doc(db, "clientes", clienteId), datos);
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

// Usado por la sincronización con la hoja de ventas: busca un cliente ya
// existente por correo (para no duplicarlo) y, si lo encuentra, le completa
// el monto pagado y el vendedor asignado sin tocar el resto de sus datos.
export async function buscarClientePorCorreo(correo: string): Promise<ClienteDoc | null> {
  const q = query(clientesRef, where("email", "==", correo));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as ClienteDoc;
}

export type CambioMontoYVendedor = {
  monto?: string;
  vendedor?: string;
};

// Compara sin escribir nada; se usa para mostrarle al admin qué cambiaría
// antes de aplicarlo.
export function detectarCambioMontoYVendedor(
  cliente: ClienteDoc,
  monto: string | null,
  vendedor: string | null
): CambioMontoYVendedor | null {
  const cambios: CambioMontoYVendedor = {};
  if (monto && monto !== cliente.monto) cambios.monto = monto;
  if (vendedor && vendedor !== cliente.vendedor) cambios.vendedor = vendedor;
  return Object.keys(cambios).length > 0 ? cambios : null;
}

export async function obtenerClientePorId(id: string): Promise<ClienteDoc | null> {
  const snap = await getDoc(doc(db, "clientes", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ClienteDoc;
}

// Devuelve true solo si de verdad se escribió algo (para no repetir el
// evento en la línea de tiempo cada 5 minutos si ya no cambió nada).
export async function actualizarMontoYVendedor(
  cliente: ClienteDoc,
  monto: string | null,
  vendedor: string | null
): Promise<boolean> {
  const cambios = detectarCambioMontoYVendedor(cliente, monto, vendedor);
  if (!cambios) return false;

  await updateDoc(doc(db, "clientes", cliente.id), cambios);
  await agregarEvento(
    cliente.id,
    cliente.nombre,
    TIPOS_EVENTO.EDICION,
    { nombre: "Sincronización automática", rol: "ADMIN" },
    `Datos completados desde la hoja de ventas${cambios.monto ? ` · Monto: ${cambios.monto}` : ""}${cambios.vendedor ? ` · Vendedor: ${cambios.vendedor}` : ""}`
  );
  return true;
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
