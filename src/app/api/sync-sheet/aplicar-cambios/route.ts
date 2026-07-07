import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";
import { aplicarCambiosPendientes, CambioAAplicar } from "@/lib/sheetSync";

export const dynamic = "force-dynamic";

// El admin ya revisó la lista de cambios propuestos (del POST a
// /api/sync-sheet) y eligió cuáles aplicar; aquí se escriben solo esos.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;

  if (!sesion || sesion.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const cambios: CambioAAplicar[] = Array.isArray(body?.cambios) ? body.cambios : [];
  if (cambios.length === 0) {
    return NextResponse.json({ error: "No se recibieron cambios" }, { status: 400 });
  }

  try {
    const resultado = await aplicarCambiosPendientes(cambios);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
