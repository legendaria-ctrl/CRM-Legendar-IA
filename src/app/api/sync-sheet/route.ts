import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";
import { sincronizarHojaVentas, sincronizarSeguimientosDesdeHoja } from "@/lib/sheetSync";

export const dynamic = "force-dynamic";

// Se llama desde el botón "Actualizar" del dashboard (solo Admin). Solo
// revisa la hoja de ventas y devuelve una previsualización: los leads
// "ganados" que aún no existen ("nuevosPendientes") y los cambios de
// monto/vendedor/tag detectados en clientes que YA existían
// ("cambiosPendientes"). No escribe nada; el admin confirma qué aplicar
// desde /api/sync-sheet/aplicar-cambios.
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;

  if (!sesion || sesion.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizarHojaVentas();
    const seguimientos = await sincronizarSeguimientosDesdeHoja();
    return NextResponse.json({ ok: true, ...resultado, seguimientos });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
