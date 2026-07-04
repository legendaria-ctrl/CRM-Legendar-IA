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

export async function obtenerAutoresUnicos(): Promise<string[]> {
  const snap = await getDocs(query(actividadRef, orderBy("autor")));
  const autores = new Set<string>();
  snap.docs.forEach((d) => {
    const autor = (d.data() as ActividadDoc).autor;
    if (autor) autores.add(autor);
  });
  return Array.from(autores).sort((a, b) => a.localeCompare(b));
}
