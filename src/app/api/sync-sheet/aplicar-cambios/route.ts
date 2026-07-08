import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";
import {
  aplicarCambiosPendientes,
  aplicarNuevosPendientes,
  CambioAAplicar,
  NuevoClientePendiente,
} from "@/lib/sheetSync";

export const dynamic = "force-dynamic";

// El admin ya revisó la lista de cambios y clientes nuevos propuestos (del
// POST a /api/sync-sheet) y eligió cuáles aplicar/crear; aquí se escriben
// solo esos.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;

  if (!sesion || sesion.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const cambios: CambioAAplicar[] = Array.isArray(body?.cambios) ? body.cambios : [];
  const nuevos: NuevoClientePendiente[] = Array.isArray(body?.nuevos) ? body.nuevos : [];
  if (cambios.length === 0 && nuevos.length === 0) {
    return NextResponse.json({ error: "No se recibió nada que aplicar" }, { status: 400 });
  }

  try {
    const [resultadoCambios, resultadoNuevos] = await Promise.all([
      cambios.length > 0 ? aplicarCambiosPendientes(cambios) : { aplicados: 0, errores: [] },
      nuevos.length > 0 ? aplicarNuevosPendientes(nuevos) : { creados: 0, errores: [] },
    ]);
    return NextResponse.json({
      ok: true,
      aplicados: resultadoCambios.aplicados,
      creados: resultadoNuevos.creados,
      errores: [...resultadoCambios.errores, ...resultadoNuevos.errores],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
