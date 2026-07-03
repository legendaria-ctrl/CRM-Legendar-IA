import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { ESTADOS_SOLICITUD, EstadoSolicitud, ROLES, Rol } from "./constants";

export type VendedorDoc = {
  id: string;
  nombre: string;
  rol: Rol;
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

// Los vendedores existentes usan el nombre normalizado como id (sin prefijo)
// para no romper sus solicitudes ya aprobadas. Los admins usan un prefijo
// para que un mismo nombre no choque entre los dos roles.
function idPara(nombre: string, rol: Rol): string {
  const base = normalizarNombre(nombre);
  return rol === ROLES.ADMIN ? `admin-${base}` : base;
}

async function existeAdminAprobado(): Promise<boolean> {
  const q = query(
    vendedoresRef,
    where("rol", "==", ROLES.ADMIN),
    where("estado", "==", ESTADOS_SOLICITUD.APROBADO),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Se llama en cada intento de login. Si es la primera vez que se usa ese
 * nombre (para ese rol), crea la solicitud en estado PENDIENTE — salvo que
 * sea el primer ADMIN que se registra, que se aprueba automáticamente para
 * no dejar la plataforma sin ningún admin aprobado. Devuelve el estado
 * actual para decidir si se le deja entrar.
 */
export async function verificarOCrearSolicitud(
  nombre: string,
  rol: Rol
): Promise<EstadoSolicitud> {
  const id = idPara(nombre, rol);
  if (!id) return ESTADOS_SOLICITUD.PENDIENTE;

  const ref = doc(db, "vendedores", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const esPrimerAdmin = rol === ROLES.ADMIN && !(await existeAdminAprobado());
    const estadoInicial = esPrimerAdmin ? ESTADOS_SOLICITUD.APROBADO : ESTADOS_SOLICITUD.PENDIENTE;

    await setDoc(ref, {
      nombre: nombre.trim(),
      rol,
      estado: estadoInicial,
      creadoEn: serverTimestamp(),
      decididoPor: esPrimerAdmin ? nombre.trim() : null,
      decididoEn: esPrimerAdmin ? serverTimestamp() : null,
    });
    return estadoInicial;
  }

  return (snap.data().estado as EstadoSolicitud) ?? ESTADOS_SOLICITUD.PENDIENTE;
}

export function suscribirVendedores(callback: (vendedores: VendedorDoc[]) => void) {
  const q = query(vendedoresRef, orderBy("creadoEn", "desc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map(
        (d) => ({ id: d.id, rol: ROLES.VENDEDOR, ...d.data() }) as VendedorDoc
      )
    );
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

/**
 * Un admin da de alta a un vendedor o a otro admin directamente, ya
 * aprobado, sin esperar a que esa persona intente entrar primero. Debe
 * usar exactamente este mismo nombre (y la clave de acceso compartida de
 * ese rol) para iniciar sesión.
 */
export async function crearVendedorAprobado(
  nombre: string,
  adminNombre: string,
  rol: Rol = ROLES.VENDEDOR
): Promise<void> {
  const limpio = nombre.trim();
  const id = idPara(limpio, rol);
  if (!id) throw new Error("El nombre no es válido.");

  const ref = doc(db, "vendedores", id);
  const existente = await getDoc(ref);
  if (existente.exists()) {
    throw new Error(
      "Ya existe alguien con ese nombre y ese rol. Búscalo en la lista de abajo y apruébalo desde ahí."
    );
  }

  await setDoc(ref, {
    nombre: limpio,
    rol,
    estado: ESTADOS_SOLICITUD.APROBADO,
    creadoEn: serverTimestamp(),
    decididoPor: adminNombre,
    decididoEn: serverTimestamp(),
  });
}
