import { NextRequest, NextResponse } from "next/server";
import { sincronizarHojaVentas } from "@/lib/sheetSync";

export const dynamic = "force-dynamic";

// Se llama cada 5 minutos (Vercel Cron o un cron externo) para revisar la
// hoja de ventas y traer al CRM los leads que ya quedaron "ganados".
export async function GET(req: NextRequest) {
  const tokenEsperado = process.env.SYNC_SECRET || "Legendaria-Sync-2026";
  const token = req.nextUrl.searchParams.get("token");

  if (token !== tokenEsperado) {
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
