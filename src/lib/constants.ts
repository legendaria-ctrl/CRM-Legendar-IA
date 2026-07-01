export const ROLES = {
  ADMIN: "ADMIN",
  VENDEDOR: "VENDEDOR",
} as const;
export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ESTADOS_CLIENTE = {
  NUEVO: "NUEVO",
  INVITACION_ENVIADA: "INVITACION_ENVIADA",
  ACTIVO: "ACTIVO",
  VENCIDO: "VENCIDO",
} as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[keyof typeof ESTADOS_CLIENTE];

export const ESTADO_LABEL: Record<EstadoCliente, string> = {
  NUEVO: "Nuevo",
  INVITACION_ENVIADA: "Invitación enviada",
  ACTIVO: "Membresía activa",
  VENCIDO: "Vencido",
};

export const TIPOS_EVENTO = {
  LLEGADA: "LLEGADA",
  INVITACION_ENVIADA: "INVITACION_ENVIADA",
  INVITACION_ACEPTADA: "INVITACION_ACEPTADA",
  RENOVACION: "RENOVACION",
  VENCIMIENTO: "VENCIMIENTO",
  NOTA: "NOTA",
} as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[keyof typeof TIPOS_EVENTO];

export const EVENTO_LABEL: Record<TipoEvento, string> = {
  LLEGADA: "Cliente registrado",
  INVITACION_ENVIADA: "Invitación enviada",
  INVITACION_ACEPTADA: "Invitación aceptada",
  RENOVACION: "Membresía renovada",
  VENCIMIENTO: "Membresía vencida",
  NOTA: "Nota",
};

export const MEMBRESIA_DIAS = 365;

export const REGIONES = {
  MX: "MX",
  US: "US",
} as const;
export type Region = (typeof REGIONES)[keyof typeof REGIONES];

export const REGION_LABEL: Record<Region, string> = {
  MX: "Legendar-IA MX",
  US: "Legendar-IA US",
};

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
    { evento: "Synergy Unlimited MX", tipo: "VIP", cantidad: 2 },
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
