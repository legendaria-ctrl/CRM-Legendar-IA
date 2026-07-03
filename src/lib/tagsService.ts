import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { COLORES_TAG } from "./constants";
import { normalizarNombre } from "./vendedoresService";

export type TagDoc = {
  id: string;
  nombre: string;
  color: string;
  creadoPor: string;
  creadoEn: Timestamp | null;
};

const tagsRef = collection(db, "tags");

export function suscribirTags(callback: (tags: TagDoc[]) => void) {
  const q = query(tagsRef, orderBy("nombre", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TagDoc));
  });
}

function colorParaNombre(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) % COLORES_TAG.length;
  return COLORES_TAG[Math.abs(hash) % COLORES_TAG.length];
}

export async function crearTag(nombre: string, autor: string): Promise<TagDoc | null> {
  const limpio = nombre.trim();
  if (!limpio) return null;
  const id = normalizarNombre(limpio);
  if (!id) return null;

  const ref = doc(db, "tags", id);
  const existente = await getDoc(ref);
  if (existente.exists()) {
    return { id: existente.id, ...existente.data() } as TagDoc;
  }

  const color = colorParaNombre(limpio);
  await setDoc(ref, {
    nombre: limpio,
    color,
    creadoPor: autor,
    creadoEn: serverTimestamp(),
  });

  return { id, nombre: limpio, color, creadoPor: autor, creadoEn: null };
}

export async function asegurarTags(nombres: string[], autor: string): Promise<void> {
  const unicos = Array.from(new Set(nombres.map((n) => n.trim()).filter(Boolean)));
  await Promise.all(unicos.map((nombre) => crearTag(nombre, autor)));
}

export async function eliminarTag(tagId: string) {
  await deleteDoc(doc(db, "tags", tagId));
}
