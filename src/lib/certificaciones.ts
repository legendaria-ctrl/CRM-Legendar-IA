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

export function certificacionPorId(id: string | null): Certificacion | null {
  if (!id) return null;
  return CERTIFICACIONES.find((c) => c.id === id) ?? null;
}
