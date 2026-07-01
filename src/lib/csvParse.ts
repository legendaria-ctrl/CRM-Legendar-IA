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
  valido: boolean;
  error?: string;
};

const ALIAS_COLUMNAS: Record<string, keyof Omit<FilaClienteCSV, "valido" | "error">> = {
  nombre: "nombre",
  "nombre completo": "nombre",
  email: "email",
  correo: "email",
  telefono: "telefono",
  "teléfono": "telefono",
  region: "region",
  "región": "region",
  notas: "notas",
};

export function filasAClientes(filas: string[][]): FilaClienteCSV[] {
  if (filas.length === 0) return [];

  const encabezados = filas[0].map((h) => h.trim().toLowerCase());
  const indices: Partial<Record<keyof Omit<FilaClienteCSV, "valido" | "error">, number>> = {};

  encabezados.forEach((encabezado, i) => {
    const campo = ALIAS_COLUMNAS[encabezado];
    if (campo) indices[campo] = i;
  });

  return filas.slice(1).map((fila) => {
    const nombre = (indices.nombre !== undefined ? fila[indices.nombre] : "")?.trim() ?? "";
    const email = (indices.email !== undefined ? fila[indices.email] : "")?.trim() ?? "";
    const telefono = (indices.telefono !== undefined ? fila[indices.telefono] : "")?.trim() ?? "";
    const regionCruda = (indices.region !== undefined ? fila[indices.region] : "")?.trim() ?? "";
    const notas = (indices.notas !== undefined ? fila[indices.notas] : "")?.trim() ?? "";

    const region = regionCruda.toUpperCase();
    const regionValida = region === "MX" || region === "US" ? region : "";

    if (!nombre) {
      return { nombre, email, telefono, region: regionValida, notas, valido: false, error: "Falta el nombre" };
    }

    return { nombre, email, telefono, region: regionValida, notas, valido: true };
  });
}
