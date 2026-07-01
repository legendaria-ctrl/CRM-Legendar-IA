import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { firmarSesion, verificarSesion, COOKIE_NAME, DURACION_SEGUNDOS } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ session: null });

  const sesion = await verificarSesion(token);
  return NextResponse.json({ session: sesion });
}

export async function POST(req: Request) {
  const { nombre, rol, clave } = await req.json();

  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "Escribe tu nombre" }, { status: 400 });
  }

  if (rol !== "ADMIN" && rol !== "VENDEDOR") {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  const claveEsperada =
    rol === "ADMIN" ? process.env.ADMIN_PASSCODE : process.env.VENDEDOR_PASSCODE;

  if (!claveEsperada || clave !== claveEsperada) {
    return NextResponse.json({ error: "Clave de acceso incorrecta" }, { status: 401 });
  }

  const token = await firmarSesion({ nombre: nombre.trim(), rol });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });

  return NextResponse.json({ session: { nombre: nombre.trim(), rol } });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
