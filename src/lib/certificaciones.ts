export type Certificacion = {
  id: string;
  nombre: string;
  etiqueta: string;
  logo: string | null;
  /** Clases de color (fondo + texto) para el chip de esta certificación. */
  color: string;
};

// Catálogo fijo de certificaciones de la plataforma. Para agregar una nueva
// certificación en el futuro, se agrega una entrada aquí (y su logo/color).
export const CERTIFICACIONES: Certificacion[] = [
  {
    id: "legendar-ia",
    nombre: "Legendar-IA",
    etiqueta: "Legendar-IA",
    logo: "/legendar-ia-logo.png",
    color: "bg-primary/10 text-primary",
  },
];

export const SIN_ASIGNAR_ID = "__sin_asignar__";

// Pseudo-certificación: agrupa a los clientes que no tienen ninguna etiqueta
// de certificación asignada todavía.
export const SIN_ASIGNAR: Certificacion = {
  id: SIN_ASIGNAR_ID,
  nombre: "No asignados",
  etiqueta: "",
  logo: null,
  color: "bg-silver text-muted",
};

export function certificacionPorId(id: string | null): Certificacion | null {
  if (!id) return null;
  if (id === SIN_ASIGNAR_ID) return SIN_ASIGNAR;
  return CERTIFICACIONES.find((c) => c.id === id) ?? null;
}
