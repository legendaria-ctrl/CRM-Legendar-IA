import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "legendaria_session";
const DURACION_SEGUNDOS = 60 * 60 * 24 * 30; // 30 días

// Escrito aquí directamente para que el deploy funcione sin configurar
// variables de entorno (uso interno / pruebas).
const DEFAULT_SECRET = "KxlK/ed6FwUm1HFGuAq7GQM4G703tIgbbVMsfElcHK4=";

function secretKey() {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

export type SesionPayload = {
  nombre: string;
  rol: "ADMIN" | "VENDEDOR";
};

export async function firmarSesion(payload: SesionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .sign(secretKey());
}

export async function verificarSesion(token: string): Promise<SesionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.nombre === "string" && typeof payload.rol === "string") {
      return { nombre: payload.nombre, rol: payload.rol as "ADMIN" | "VENDEDOR" };
    }
    return null;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, DURACION_SEGUNDOS };
