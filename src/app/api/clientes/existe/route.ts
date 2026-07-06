import { NextRequest, NextResponse } from "next/server";
import { buscarClientePorCorreo } from "@/lib/clientesService";
import { beneficiosDeRegion } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Endpoint server-a-servidor para que otro CRM pregunte si un cliente ya
// existe aquí (y así decida si mostrar el botón "Ver en CRM Legendar-IA").
// No usa la sesión de admin (el otro CRM no la tiene); se protege con una
// clave compartida propia en el header "x-api-key".
export async function GET(req: NextRequest) {
  const clave = req.headers.get("x-api-key");
  if (!clave || clave !== process.env.CLIENTES_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const correo = req.nextUrl.searchParams.get("correo");
  if (!correo) {
    return NextResponse.json({ error: "Falta el parámetro correo" }, { status: 400 });
  }

  try {
    const cliente = await buscarClientePorCorreo(correo);
    return NextResponse.json({
      existe: !!cliente,
      certificacion: cliente?.etiquetas ?? [],
      region: cliente?.region ?? null,
      beneficios: beneficiosDeRegion(cliente?.region),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
