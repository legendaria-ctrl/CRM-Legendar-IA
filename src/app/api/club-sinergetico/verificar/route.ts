import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

// Proxy server-a-servidor hacia el CRM del Club Sinergético: le pregunta si
// un correo/teléfono ya es socio ahí y si su membresía sigue vigente. La
// key compartida (CLUB_SINERGETICO_API_KEY) nunca se expone al navegador.
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const correo = req.nextUrl.searchParams.get("correo") || "";
  const telefono = req.nextUrl.searchParams.get("telefono") || "";
  if (!correo && !telefono) {
    return NextResponse.json({ error: "Falta correo o telefono" }, { status: 400 });
  }

  const apiKey = process.env.CLUB_SINERGETICO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ existe: false, error: "Integración no configurada" });
  }

  const params = new URLSearchParams();
  if (correo) params.set("correo", correo);
  if (telefono) params.set("telefono", telefono);
  const url = `https://crm-club-sinergetico.vercel.app/api/clientes-existe?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { "x-api-key": apiKey } });
    if (!res.ok) {
      return NextResponse.json({ existe: false });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ existe: false });
  }
}
