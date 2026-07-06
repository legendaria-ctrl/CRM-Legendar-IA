import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { crearNotificacionActividad } from "./notificacionesService";
import { EVENTO_LABEL, TipoEvento } from "./constants";

export type ActividadDoc = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  accion: string;
  autor: string;
  autorRol: string;
  nota: string | null;
  fecha: Timestamp | null;
};

const actividadRef = collection(db, "actividad");

export async function registrarActividad(input: {
  clienteId: string;
  clienteNombre: string;
  accion: string;
  autor: string;
  autorRol: string;
  nota?: string | null;
}) {
  await addDoc(actividadRef, {
    clienteId: input.clienteId,
    clienteNombre: input.clienteNombre,
    accion: input.accion,
    autor: input.autor,
    autorRol: input.autorRol,
    nota: input.nota || null,
    fecha: serverTimestamp(),
  });

  if (input.autorRol === "VENDEDOR") {
    const accionLabel = EVENTO_LABEL[input.accion as TipoEvento] ?? input.accion;
    const esEliminacion = input.accion === "ELIMINACION";
    await crearNotificacionActividad(
      { nombre: input.autor, rol: input.autorRol },
      `${input.autor} · ${accionLabel}: ${input.clienteNombre}`,
      esEliminacion ? null : input.clienteId,
      input.clienteNombre
    );
  }
}

export async function obtenerActividad(rango: {
  desde: Date;
  hasta: Date;
  autor?: string;
}): Promise<ActividadDoc[]> {
  const q = query(
    actividadRef,
    where("fecha", ">=", Timestamp.fromDate(rango.desde)),
    where("fecha", "<=", Timestamp.fromDate(rango.hasta)),
    orderBy("fecha", "desc")
  );

  const snap = await getDocs(q);
  let resultados = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActividadDoc);

  if (rango.autor) {
    resultados = resultados.filter((r) => r.autor === rango.autor);
  }

  return resultados;
}

// Junta las notas del historial (línea de tiempo) de cada cliente en un solo
// texto, para poder incluirlas como criterio de búsqueda en el listado.
//
// Esto lee toda la colección "actividad", así que se cachea en memoria un
// rato corto: si el usuario navega entre el dashboard y otras pantallas
// varias veces seguidas, no vuelve a leer la colección completa cada vez.
const CACHE_NOTAS_MS = 2 * 60 * 1000; // 2 minutos
let cacheNotas: { datos: Record<string, string>; expira: number } | null = null;

export async function obtenerNotasHistorialPorCliente(): Promise<Record<string, string>> {
  if (cacheNotas && cacheNotas.expira > Date.now()) {
    return cacheNotas.datos;
  }

  const snap = await getDocs(actividadRef);
  const notasPorCliente: Record<string, string[]> = {};
  snap.docs.forEach((d) => {
    const data = d.data() as ActividadDoc;
    if (!data.nota) return;
    if (!notasPorCliente[data.clienteId]) notasPorCliente[data.clienteId] = [];
    notasPorCliente[data.clienteId].push(data.nota);
  });
  const resultado = Object.fromEntries(
    Object.entries(notasPorCliente).map(([id, notas]) => [id, notas.join(" ")])
  );

  cacheNotas = { datos: resultado, expira: Date.now() + CACHE_NOTAS_MS };
  return resultado;
}

export async function obtenerAutoresUnicos(): Promise<string[]> {
  const snap = await getDocs(query(actividadRef, orderBy("autor")));
  const autores = new Set<string>();
  snap.docs.forEach((d) => {
    const autor = (d.data() as ActividadDoc).autor;
    if (autor) autores.add(autor);
  });
  return Array.from(autores).sort((a, b) => a.localeCompare(b));
}
