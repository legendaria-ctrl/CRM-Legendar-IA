export const ROLES = {
  ADMIN: "ADMIN",
  VENDEDOR: "VENDEDOR",
} as const;
export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ESTADOS_CLIENTE = {
  SEGUIMIENTO: "SEGUIMIENTO",
  PENDIENTE_AUTORIZACION: "PENDIENTE_AUTORIZACION",
  NUEVO: "NUEVO",
  INVITACION_ENVIADA: "INVITACION_ENVIADA",
  ACTIVO: "ACTIVO",
  VENCIDO: "VENCIDO",
} as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[keyof typeof ESTADOS_CLIENTE];

export const ESTADO_LABEL: Record<EstadoCliente, string> = {
  SEGUIMIENTO: "Seguimiento",
  PENDIENTE_AUTORIZACION: "Pendiente de autorización",
  NUEVO: "Nuevo",
  INVITACION_ENVIADA: "Invitación enviada",
  ACTIVO: "Miembro",
  VENCIDO: "Vencido",
};

export const ESTADOS_BIENVENIDA = {
  PENDIENTE: "PENDIENTE",
  ENVIADA: "ENVIADA",
  INVALIDO: "INVALIDO",
} as const;
export type EstadoBienvenida = (typeof ESTADOS_BIENVENIDA)[keyof typeof ESTADOS_BIENVENIDA];

export const BIENVENIDA_LABEL: Record<EstadoBienvenida, string> = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada",
  INVALIDO: "Número inválido",
};

export const TIPOS_EVENTO = {
  LLEGADA: "LLEGADA",
  INVITACION_ENVIADA: "INVITACION_ENVIADA",
  INVITACION_ACEPTADA: "INVITACION_ACEPTADA",
  RENOVACION: "RENOVACION",
  VENCIMIENTO: "VENCIMIENTO",
  NOTA: "NOTA",
  ELIMINACION: "ELIMINACION",
  IMPORTACION: "IMPORTACION",
  MENSAJE_BIENVENIDA: "MENSAJE_BIENVENIDA",
  RESTAURACION: "RESTAURACION",
  PAUSA: "PAUSA",
  REANUDACION: "REANUDACION",
  EXTENSION: "EXTENSION",
  TAGS: "TAGS",
  VENDEDOR: "VENDEDOR",
  ETIQUETAS: "ETIQUETAS",
  EDICION: "EDICION",
  PAPELERA: "PAPELERA",
  RESTAURACION_PAPELERA: "RESTAURACION_PAPELERA",
  ELIMINACION_PERMANENTE: "ELIMINACION_PERMANENTE",
  ABONO: "ABONO",
  ENVIO_REVISION: "ENVIO_REVISION",
  AUTORIZACION: "AUTORIZACION",
} as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[keyof typeof TIPOS_EVENTO];

export const EVENTO_LABEL: Record<TipoEvento, string> = {
  LLEGADA: "Cliente registrado",
  INVITACION_ENVIADA: "Invitación enviada",
  INVITACION_ACEPTADA: "Invitación aceptada",
  RENOVACION: "Membresía renovada",
  VENCIMIENTO: "Membresía vencida",
  NOTA: "Nota",
  ELIMINACION: "Cliente eliminado",
  IMPORTACION: "Cliente importado por CSV",
  MENSAJE_BIENVENIDA: "Mensaje de bienvenida",
  RESTAURACION: "Acción deshecha",
  PAUSA: "Membresía pausada",
  REANUDACION: "Membresía reanudada",
  EXTENSION: "Membresía extendida",
  TAGS: "Tags actualizados",
  VENDEDOR: "Vendedor actualizado",
  ETIQUETAS: "Certificación asignada",
  EDICION: "Datos del cliente editados",
  PAPELERA: "Enviado a la papelera",
  RESTAURACION_PAPELERA: "Restaurado de la papelera",
  ELIMINACION_PERMANENTE: "Eliminado definitivamente",
  ABONO: "Abono registrado",
  ENVIO_REVISION: "Enviado a autorización",
  AUTORIZACION: "Autorizado por administración",
};

export const COLORES_TAG = [
  "bg-primary/10 text-primary",
  "bg-success/10 text-success",
  "bg-warning/10 text-warning",
  "bg-danger/10 text-danger",
  "bg-purple-500/10 text-purple-600",
  "bg-pink-500/10 text-pink-600",
  "bg-cyan-500/10 text-cyan-600",
  "bg-amber-500/10 text-amber-600",
] as const;

export const MEMBRESIA_DIAS = 365;
export const PAPELERA_DIAS = 30;

export const REGIONES = {
  MX: "MX",
  US: "US",
} as const;
export type Region = (typeof REGIONES)[keyof typeof REGIONES];

export const REGION_LABEL: Record<Region, string> = {
  MX: "Legendar-IA MX",
  US: "Legendar-IA US",
};

export const MONEDA_POR_REGION: Record<Region, string> = {
  MX: "MXN",
  US: "USD",
};

export function formatearMonto(monto: number, region: string | null | undefined): string {
  const moneda = region === "MX" || region === "US" ? MONEDA_POR_REGION[region] : "";
  return `$${monto.toLocaleString("es-MX")}${moneda ? ` ${moneda}` : ""}`;
}

export type Beneficio = {
  evento: string;
  tipo: string;
  cantidad: number;
};

// Synergy Unlimited: evento presencial anual. Los boletos que le corresponden
// a cada cliente dependen de la región a la que pertenece.
export const BENEFICIOS_POR_REGION: Record<Region, Beneficio[]> = {
  MX: [{ evento: "Synergy Unlimited MX", tipo: "General", cantidad: 1 }],
  US: [
    { evento: "Synergy Unlimited MX", tipo: "VIP", cantidad: 1 },
    { evento: "Synergy Unlimited US", tipo: "General", cantidad: 1 },
  ],
};

export function beneficiosDeRegion(region: string | null | undefined): Beneficio[] {
  if (region === "MX" || region === "US") return BENEFICIOS_POR_REGION[region];
  return [];
}

export const ESTADOS_SOLICITUD = {
  PENDIENTE: "PENDIENTE",
  APROBADO: "APROBADO",
  RECHAZADO: "RECHAZADO",
} as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[keyof typeof ESTADOS_SOLICITUD];
