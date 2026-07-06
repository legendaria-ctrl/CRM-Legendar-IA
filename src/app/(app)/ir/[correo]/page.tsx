import { notFound, redirect } from "next/navigation";
import { buscarClientePorCorreo } from "@/lib/clientesService";

// Puente para que otras plataformas (ej. un CRM más grande) puedan enlazar
// directo al perfil de un cliente aquí sin conocer su ID interno de
// Firestore: solo necesitan su correo, ej. /ir/juan@correo.com
export default async function IrPorCorreoPage({
  params,
}: {
  params: Promise<{ correo: string }>;
}) {
  const { correo } = await params;
  const cliente = await buscarClientePorCorreo(decodeURIComponent(correo));
  if (!cliente) notFound();
  redirect(`/clientes/${cliente.id}`);
}
