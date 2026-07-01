import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { ESTADOS_SOLICITUD, EstadoSolicitud } from "./constants";

export type VendedorDoc = {
  id: string;
  nombre: string;
  estado: EstadoSolicitud;
  creadoEn: Timestamp | null;
  decididoPor: string | null;
  decididoEn: Timestamp | null;
};

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

export function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const vendedoresRef = collection(db, "vendedores");

/**
 * Se llama en cada intento de login de un vendedor. Si es la primera vez que
 * usa ese nombre, crea la solicitud en estado PENDIENTE. Devuelve el estado
 * actual para decidir si se le deja entrar.
 */
export async function verificarOCrearSolicitud(nombre: string): Promise<EstadoSolicitud> {
  const id = normalizarNombre(nombre);
  if (!id) return ESTADOS_SOLICITUD.PENDIENTE;

  const ref = doc(db, "vendedores", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      nombre,
      estado: ESTADOS_SOLICITUD.PENDIENTE,
      creadoEn: serverTimestamp(),
      decididoPor: null,
      decididoEn: null,
    });
    return ESTADOS_SOLICITUD.PENDIENTE;
  }

  return (snap.data().estado as EstadoSolicitud) ?? ESTADOS_SOLICITUD.PENDIENTE;
}

export function suscribirVendedores(callback: (vendedores: VendedorDoc[]) => void) {
  const q = query(vendedoresRef, orderBy("creadoEn", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VendedorDoc));
  });
}

export async function decidirSolicitud(
  id: string,
  estado: "APROBADO" | "RECHAZADO",
  adminNombre: string
) {
  await updateDoc(doc(db, "vendedores", id), {
    estado,
    decididoPor: adminNombre,
    decididoEn: serverTimestamp(),
  });
}
