import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";
import { sincronizarSeguimientosDesdeHoja } from "@/lib/sheetSync";

export const dynamic = "force-dynamic";

// A diferencia de /api/sync-sheet (solo ADMIN), este endpoint también lo usa
// el botón "Actualizar" de /seguimientos para cualquier vendedor.
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;

  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizarSeguimientosDesdeHoja();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
