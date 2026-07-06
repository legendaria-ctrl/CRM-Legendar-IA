import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";
import { sincronizarHojaVentas } from "@/lib/sheetSync";

export const dynamic = "force-dynamic";

// Se llama desde el botón "Actualizar" del dashboard (solo Admin). Revisa la
// hoja de ventas y trae al CRM los leads que ya quedaron "ganados", o
// completa monto/vendedor de los que ya existían.
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;

  if (!sesion || sesion.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizarHojaVentas();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
