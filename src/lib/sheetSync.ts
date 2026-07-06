import { parsearCSV } from "./csvParse";
import {
  crearCliente,
  buscarClientePorCorreo,
  actualizarMontoYVendedor,
} from "./clientesService";
import { CERTIFICACIONES } from "./certificaciones";

// Trackers de ventas de Legendar-IA (misma estructura de columnas en ambas
// hojas, una por región).
const HOJAS = [
  { region: "MX", sheetId: "1LaldIZLNdgjt9taTDzyIXAMDSdEYYpl5By-KLJAlPLk", gid: "1759324868" },
  { region: "US", sheetId: "15FgcB4VQADP8-DEjsT-gUhZjMp6OnbdEUG6R_OaqyNs", gid: "1759324868" },
] as const;

// Solo estos estados de la columna ESTADO cuentan como "cliente ganado".
// "APARTADO" (sin /PAGADO) explícitamente NO cuenta.
const ESTADOS_GANADORES = new Set([
  "vendido",
  "seg. vendido",
  "repitch vendido",
  "apart/pagado",
  "upgrade",
  "1a upgrade",
]);

const ETIQUETA_LEGENDARIA = CERTIFICACIONES[0]?.etiqueta ?? "Legendar-IA";

const MESES: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

// Las hojas guardan fechas como "1-jul" o "16-jun" (sin año). Se asume el
// año en curso; si el mes ya pasó y estamos a inicio de año siguiente esto
// podría desfasarse, pero es aceptable para un tracker que se revisa seguido.
function parsearFechaHoja(texto: string): Date | null {
  const limpio = texto.trim().toLowerCase();
  const match = limpio.match(/^(\d{1,2})-([a-z]{3})$/);
  if (!match) return null;
  const [, dia, mesTexto] = match;
  const mes = MESES[mesTexto];
  if (mes === undefined) return null;
  return new Date(new Date().getFullYear(), mes, Number(dia));
}

// La columna CORREGIDO ya trae el celular local limpio (10 dígitos, sin
// código de país). Si falta, se intenta sacar de CELULAR quitando el
// código de país correspondiente a la región de la hoja (52 para MX, 1
// para US) si lo trae.
function limpiarTelefono(corregido: string, celular: string, region: "MX" | "US"): string | null {
  const deCorregido = corregido.replace(/[^0-9]/g, "");
  if (deCorregido.length === 10) return deCorregido;

  let digitos = celular.replace(/[^0-9]/g, "");
  if (region === "MX") {
    if (digitos.length === 12 && digitos.startsWith("52")) digitos = digitos.slice(2);
    else if (digitos.length === 13 && digitos.startsWith("521")) digitos = digitos.slice(3);
  } else if (digitos.length === 11 && digitos.startsWith("1")) {
    digitos = digitos.slice(1);
  }
  return digitos || null;
}

type FilaHoja = {
  fecha: string;
  nombre: string;
  correo: string;
  celular: string;
  corregido: string;
  amount: string;
  estado: string;
  assigned: string;
  abejaSeguimiento: string;
};

// Los encabezados de estas hojas no sirven para ubicar columnas por nombre:
// vienen repetidos (hay dos columnas literalmente tituladas "ESTADO") y con
// saltos de línea internos. Se usa la posición fija de cada columna, ya
// verificada contra ambas hojas reales (misma plantilla):
// A id, B fecha, C nombre, D correo, E lada, F celular, G corregido,
// H wa.me, I método de pago, J monto ("$"), K moneda, L notas,
// M estado del lead, N abeja seguimiento, O vendedor asignado.
const COL = {
  fecha: 1,
  nombre: 2,
  correo: 3,
  celular: 5,
  corregido: 6,
  amount: 9,
  estado: 12,
  abejaSeguimiento: 13,
  assigned: 14,
};

function filasAObjetos(filas: string[][]): FilaHoja[] {
  if (filas.length === 0) return [];
  const leer = (fila: string[], i: number) => (fila[i] ?? "").trim();

  return filas.slice(1).map((fila) => ({
    fecha: leer(fila, COL.fecha),
    nombre: leer(fila, COL.nombre),
    correo: leer(fila, COL.correo),
    celular: leer(fila, COL.celular),
    corregido: leer(fila, COL.corregido),
    amount: leer(fila, COL.amount),
    estado: leer(fila, COL.estado),
    assigned: leer(fila, COL.assigned),
    abejaSeguimiento: leer(fila, COL.abejaSeguimiento),
  }));
}

// La columna O (vendedor asignado) a veces viene vacía o como "Empresa"; en
// esos casos la columna N (Abeja Seguimiento) suele traer el nombre de quien
// de verdad le dio seguimiento. Se usa ese nombre en vez de "Empresa"/vacío
// cuando está disponible.
function resolverVendedor(fila: FilaHoja): string | null {
  const asignado = fila.assigned.trim();
  const esVacioOEmpresa = !asignado || asignado.toLowerCase() === "empresa";
  if (esVacioOEmpresa && fila.abejaSeguimiento) return fila.abejaSeguimiento;
  return asignado || null;
}

export type ResultadoSincronizacion = {
  filasLeidas: number;
  ganadoras: number;
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: string[];
};

const AUTOR_SISTEMA = { nombre: "Sincronización automática", rol: "ADMIN" };

async function sincronizarHoja(
  region: "MX" | "US",
  sheetId: string,
  gid: string,
  resultado: ResultadoSincronizacion
): Promise<void> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) {
    resultado.errores.push(`Hoja ${region}: no se pudo leer (status ${res.status})`);
    return;
  }
  const texto = await res.text();
  const filas = filasAObjetos(parsearCSV(texto));
  resultado.filasLeidas += filas.length;

  for (const fila of filas) {
    const estado = fila.estado.trim().toLowerCase();
    if (!ESTADOS_GANADORES.has(estado)) continue;
    resultado.ganadoras++;

    if (!fila.correo) {
      resultado.omitidos++;
      continue;
    }

    try {
      const existente = await buscarClientePorCorreo(fila.correo);
      const monto = fila.amount || null;
      const vendedor = resolverVendedor(fila);

      if (existente) {
        const seActualizo = await actualizarMontoYVendedor(existente, monto, vendedor);
        if (seActualizo) resultado.actualizados++;
        else resultado.omitidos++;
      } else {
        const fechaInscripcion = parsearFechaHoja(fila.fecha) ?? undefined;
        const telefono = limpiarTelefono(fila.corregido, fila.celular, region);
        await crearCliente({
          nombre: fila.nombre || fila.correo,
          email: fila.correo,
          telefono: telefono ?? undefined,
          region,
          etiquetas: [ETIQUETA_LEGENDARIA],
          vendedor: vendedor ?? undefined,
          monto: monto ?? undefined,
          fechaInscripcion,
          autor: AUTOR_SISTEMA.nombre,
          autorRol: AUTOR_SISTEMA.rol,
          origen: "sheet",
        });
        resultado.creados++;
      }
    } catch (err) {
      resultado.errores.push(
        `${fila.correo}: ${err instanceof Error ? err.message : "error desconocido"}`
      );
    }
  }
}

export async function sincronizarHojaVentas(): Promise<ResultadoSincronizacion> {
  const resultado: ResultadoSincronizacion = {
    filasLeidas: 0,
    ganadoras: 0,
    creados: 0,
    actualizados: 0,
    omitidos: 0,
    errores: [],
  };

  for (const hoja of HOJAS) {
    await sincronizarHoja(hoja.region, hoja.sheetId, hoja.gid, resultado);
  }

  return resultado;
}
