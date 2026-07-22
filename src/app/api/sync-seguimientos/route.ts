import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";
import { sincronizarSeguimientosDesdeHoja } from "@/lib/sheetSync";

export const dynamic = "force-dynamic";

// A diferencia de /api/sync-sheet (solo ADMIN), este endpoint también lo usa
// el botón "Actualizar" de /seguimientos para cualquier vendedor, y además
// lo dispara Vercel Cron cada 15 min sin sesión de nadie (autenticado con
// CRON_SECRET en el header Authorization que Vercel agrega automáticamente).
async function autorizado(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;
  return !!sesion;
}

async function manejar(req: NextRequest) {
  if (!(await autorizado(req))) {
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

export async function GET(req: NextRequest) {
  return manejar(req);
}

export async function POST(req: NextRequest) {
  return manejar(req);
}
