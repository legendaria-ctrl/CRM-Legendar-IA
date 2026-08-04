import type { Autor } from "./clientesService";
import { crearTag } from "./tagsService";

const TAG_ACTIVO = "Club Sinergético: Activo";
const TAG_VENCIDO = "Club Sinergético: Vencido";
const COLOR_ACTIVO = "bg-success/10 text-success";
const COLOR_VENCIDO = "bg-danger/10 text-danger";

const AUTOR_INTEGRACION: Autor = { nombre: "Integración Club Sinergético", rol: "ADMIN" };

type RespuestaVerificacion = {
  existe: boolean;
  activo?: boolean;
};

// Desde el navegador pasa por nuestro propio proxy (/api/club-sinergetico/
// verificar) para no exponer la key. Desde el servidor (ej. crearCliente()
// llamado dentro de una ruta API del sync del sheet) un fetch relativo no
// funciona, así que ahí se llama directo al otro CRM con la key del env.
async function consultarClubSinergetico(
  correo?: string | null,
  telefono?: string | null
): Promise<RespuestaVerificacion> {
  const params = new URLSearchParams();
  if (correo) params.set("correo", correo);
  if (telefono) params.set("telefono", telefono);

  if (typeof window === "undefined") {
    const apiKey = process.env.CLUB_SINERGETICO_API_KEY;
    if (!apiKey) return { existe: false };
    const res = await fetch(
      `https://crm-club-sinergetico.vercel.app/api/clientes-existe?${params.toString()}`,
      { headers: { "x-api-key": apiKey } }
    );
    if (!res.ok) return { existe: false };
    return res.json();
  }

  const res = await fetch(`/api/club-sinergetico/verificar?${params.toString()}`);
  if (!res.ok) return { existe: false };
  return res.json();
}

// Consulta si el correo/teléfono de un cliente recién creado ya es socio
// del Club Sinergético y, si lo es, le pone el tag verde o rojo según si su
// membresía sigue vigente. Es enriquecimiento, no una acción crítica: si
// algo falla (red, key mal puesta, el otro CRM caído) se registra en
// consola y no interrumpe ni le avisa nada al usuario. El import de
// clientesService es dinámico para no crear un ciclo (crearCliente llama a
// esta función).
export async function verificarClubSinergetico(
  clienteId: string,
  clienteNombre: string,
  correo?: string | null,
  telefono?: string | null
): Promise<void> {
  if (!correo && !telefono) return;

  try {
    const data = await consultarClubSinergetico(correo, telefono);
    if (!data.existe) return;

    const { agregarTagsCliente, quitarTagCliente, obtenerClientePorId } = await import(
      "./clientesService"
    );

    const cliente = await obtenerClientePorId(clienteId);
    const tagsActuales = cliente?.tags ?? [];
    const tagNuevo = data.activo ? TAG_ACTIVO : TAG_VENCIDO;
    const tagViejo = data.activo ? TAG_VENCIDO : TAG_ACTIVO;
    const colorNuevo = data.activo ? COLOR_ACTIVO : COLOR_VENCIDO;

    await crearTag(tagNuevo, AUTOR_INTEGRACION.nombre, colorNuevo);
    if (!tagsActuales.includes(tagNuevo)) {
      await agregarTagsCliente(clienteId, clienteNombre, AUTOR_INTEGRACION, [tagNuevo]);
    }
    if (tagsActuales.includes(tagViejo)) {
      await quitarTagCliente(clienteId, clienteNombre, AUTOR_INTEGRACION, tagViejo);
    }
  } catch (err) {
    console.error("verificarClubSinergetico falló (no crítico):", err);
  }
}
