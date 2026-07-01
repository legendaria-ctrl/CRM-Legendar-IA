/** Parser de CSV simple: soporta comillas, comas dentro de campos y saltos de línea \r\n o \n. */
export function parsearCSV(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let dentroDeComillas = false;

  const limpio = texto.replace(/^﻿/, "");

  for (let i = 0; i < limpio.length; i++) {
    const char = limpio[i];
    const siguiente = limpio[i + 1];

    if (dentroDeComillas) {
      if (char === '"' && siguiente === '"') {
        campo += '"';
        i++;
      } else if (char === '"') {
        dentroDeComillas = false;
      } else {
        campo += char;
      }
      continue;
    }

    if (char === '"') {
      dentroDeComillas = true;
    } else if (char === ",") {
      fila.push(campo);
      campo = "";
    } else if (char === "\r") {
      // ignorar, \n lo maneja
    } else if (char === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += char;
    }
  }

  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

export type FilaClienteCSV = {
  nombre: string;
  email: string;
  telefono: string;
  region: string;
  notas: string;
  fechaInscripcionTexto: string;
  fechaInscripcion: Date | null;
  mensajeBienvenida: boolean;
  valido: boolean;
  error?: string;
};

type CampoTexto = "nombre" | "email" | "telefono" | "region" | "notas" | "fechaInscripcionTexto" | "mensajeBienvenidaTexto";

const ALIAS_COLUMNAS: Record<string, CampoTexto> = {
  nombre: "nombre",
  "nombre completo": "nombre",
  email: "email",
  correo: "email",
  telefono: "telefono",
  "teléfono": "telefono",
  region: "region",
  "región": "region",
  notas: "notas",
  fecha_inscripcion: "fechaInscripcionTexto",
  "fecha de inscripcion": "fechaInscripcionTexto",
  "fecha de inscripción": "fechaInscripcionTexto",
  fecha_inscripción: "fechaInscripcionTexto",
  mensaje_bienvenida: "mensajeBienvenidaTexto",
  "mensaje de bienvenida": "mensajeBienvenidaTexto",
};

const VALORES_VERDADEROS = new Set(["si", "sí", "true", "1", "x", "yes"]);

function parsearFecha(texto: string): Date | null {
  const limpio = texto.trim();
  if (!limpio) return null;

  const isoMatch = limpio.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const fecha = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const ddmmyyyyMatch = limpio.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, d, m, y] = ddmmyyyyMatch;
    const fecha = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fallback = new Date(limpio);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function filasAClientes(filas: string[][]): FilaClienteCSV[] {
  if (filas.length === 0) return [];

  const encabezados = filas[0].map((h) => h.trim().toLowerCase());
  const indices: Partial<Record<CampoTexto, number>> = {};

  encabezados.forEach((encabezado, i) => {
    const campo = ALIAS_COLUMNAS[encabezado];
    if (campo) indices[campo] = i;
  });

  const leer = (fila: string[], campo: CampoTexto) =>
    (indices[campo] !== undefined ? fila[indices[campo] as number] : "")?.trim() ?? "";

  return filas.slice(1).map((fila) => {
    const nombre = leer(fila, "nombre");
    const email = leer(fila, "email");
    const telefono = leer(fila, "telefono");
    const notas = leer(fila, "notas");
    const fechaInscripcionTexto = leer(fila, "fechaInscripcionTexto");
    const mensajeBienvenidaTexto = leer(fila, "mensajeBienvenidaTexto");

    const regionCruda = leer(fila, "region").toUpperCase();
    const region = regionCruda === "MX" || regionCruda === "US" ? regionCruda : "";

    const mensajeBienvenida = VALORES_VERDADEROS.has(mensajeBienvenidaTexto.toLowerCase());

    const base = {
      nombre,
      email,
      telefono,
      region,
      notas,
      fechaInscripcionTexto,
      mensajeBienvenida,
    };

    if (!nombre) {
      return { ...base, fechaInscripcion: null, valido: false, error: "Falta el nombre" };
    }

    if (fechaInscripcionTexto) {
      const fechaInscripcion = parsearFecha(fechaInscripcionTexto);
      if (!fechaInscripcion) {
        return {
          ...base,
          fechaInscripcion: null,
          valido: false,
          error: "Fecha de inscripción inválida (usa AAAA-MM-DD)",
        };
      }
      return { ...base, fechaInscripcion, valido: true };
    }

    return { ...base, fechaInscripcion: null, valido: true };
  });
}
