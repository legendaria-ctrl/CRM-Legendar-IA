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
