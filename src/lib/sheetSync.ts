import { parsearCSV } from "./csvParse";
import {
  crearCliente,
  buscarClientePorCorreo,
  buscarClientePorTelefono,
  ultimos10Digitos,
  detectarCambioMontoYVendedor,
  actualizarMontoYVendedor,
  actualizarVendedor,
  registrarAbono,
  agregarTagsCliente,
  obtenerClientePorId,
  graduarSeguimientoACliente,
  ClienteDoc,
  Autor,
} from "./clientesService";
import { CERTIFICACIONES } from "./certificaciones";
import { ESTADOS_CLIENTE, MONEDA_POR_REGION, Region } from "./constants";
import { normalizarNombre } from "./vendedoresService";

// Trackers de ventas de Legendar-IA (misma estructura de columnas en todas
// las hojas). MX y US son de un solo país cada una; LATAM agrupa varios
// países en una sola hoja y por eso el código de país no se decide por hoja
// sino fila por fila, con la columna E (lada) — ver limpiarTelefono().
const HOJAS: { region: Region; sheetId: string; gid: string }[] = [
  { region: "MX", sheetId: "1LaldIZLNdgjt9taTDzyIXAMDSdEYYpl5By-KLJAlPLk", gid: "1759324868" },
  { region: "US", sheetId: "15FgcB4VQADP8-DEjsT-gUhZjMp6OnbdEUG6R_OaqyNs", gid: "1759324868" },
  { region: "LATAM", sheetId: "1xZaHBqsGd4UA6hP5QIjzbrlbQJvlkWRAEuamat_tsI4", gid: "1759324868" },
];

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

// Solo el estado exacto "Upgrade" (no "1A Upgrade") marca al cliente con
// el tag "Miembro del CS", ya existente en /tags.
const TAG_MIEMBRO_CS = "Miembro del CS";
const ESTADO_MIEMBRO_CS = "upgrade";

// La columna CORREGIDO ya trae el celular local limpio (10 dígitos, sin
// código de país). Si falta, se intenta sacar de CELULAR quitando el código
// de país. En MX/US ese código es fijo por hoja (52 para MX, 1 para US). En
// LATAM cada fila puede ser de un país distinto, así que se usa la columna E
// (lada) de esa misma fila en vez de un código fijo.
function limpiarTelefono(
  corregido: string,
  celular: string,
  region: Region,
  lada: string
): string | null {
  const deCorregido = corregido.replace(/[^0-9]/g, "");
  if (deCorregido.length === 10) return deCorregido;

  let digitos = celular.replace(/[^0-9]/g, "");
  if (region === "MX") {
    if (digitos.length === 12 && digitos.startsWith("52")) digitos = digitos.slice(2);
    else if (digitos.length === 13 && digitos.startsWith("521")) digitos = digitos.slice(3);
  } else if (region === "US") {
    if (digitos.length === 11 && digitos.startsWith("1")) digitos = digitos.slice(1);
  } else {
    const codigo = lada.replace(/[^0-9]/g, "");
    if (codigo && digitos.startsWith(codigo) && digitos.length > codigo.length) {
      digitos = digitos.slice(codigo.length);
    }
  }
  return digitos || null;
}

type FilaHoja = {
  fecha: string;
  nombre: string;
  correo: string;
  celular: string;
  corregido: string;
  lada: string;
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
// La columna A (id) NO se usa para reconocer clientes entre sincronizaciones:
// no es única (varias personas distintas comparten el mismo valor, ej. "x"
// como placeholder), así que confiar en ella mezclaba a gente distinta. Ver
// buscarExistente().
const COL = {
  fecha: 1,
  nombre: 2,
  correo: 3,
  lada: 4,
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
    lada: leer(fila, COL.lada),
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

// Busca primero por correo (como siempre) y, si no encuentra a nadie, cae a
// los últimos 10 dígitos del teléfono — por si a ese cliente ya existente
// le corrigieron el correo en el CRM después de haberlo importado y ya no
// hace match. No se usa el id de la fila del sheet para esto: esa columna
// no es única entre personas distintas (ver comentario en COL).
async function buscarExistente(
  fila: FilaHoja,
  telefonoLimpio: string | null
): Promise<ClienteDoc | null> {
  const porCorreo = await buscarClientePorCorreo(fila.correo);
  if (porCorreo) return porCorreo;

  const ultimos10 = ultimos10Digitos(telefonoLimpio);
  if (!ultimos10) return null;
  return buscarClientePorTelefono(ultimos10);
}

// Cambio detectado en un cliente que YA existe en el CRM (monto y/o
// vendedor distintos a lo que trae la hoja). No se escribe solo; el admin
// lo revisa y decide cuáles aplicar desde el botón "Actualizar".
export type CambioPendiente = {
  clienteId: string;
  nombre: string;
  correo: string;
  monto?: { actual: string | null; nuevo: string };
  vendedor?: { actual: string | null; nuevo: string };
  telefono?: { actual: string | null; nuevo: string };
  agregarTagMiembroCS?: boolean;
  // El cliente todavía estaba en Seguimiento en el CRM y la hoja ya lo
  // marca como venta ganada: al aplicar este cambio se gradúa a Cliente
  // nuevo directo (sin pasar por Pendientes de autorización).
  graduarDeSeguimiento?: boolean;
};

// Cliente que la hoja trae y todavía no existe en el CRM. Tampoco se crea
// solo: se le muestra al admin junto con los cambios para que confirme.
export type NuevoClientePendiente = {
  correo: string;
  nombre: string;
  telefono: string | null;
  region: Region;
  vendedor: string | null;
  monto: string | null;
  tags: string[];
};

export type ResultadoSincronizacion = {
  filasLeidas: number;
  ganadoras: number;
  omitidos: number;
  errores: string[];
  cambiosPendientes: CambioPendiente[];
  nuevosPendientes: NuevoClientePendiente[];
};

const AUTOR_SISTEMA = { nombre: "Sincronización automática", rol: "ADMIN" };

async function sincronizarHoja(
  region: Region,
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
      const monto = fila.amount || null;
      const vendedor = resolverVendedor(fila);
      const telefonoHoja = limpiarTelefono(fila.corregido, fila.celular, region, fila.lada);
      const existente = await buscarExistente(fila, telefonoHoja);
      const esMiembroCS = estado === ESTADO_MIEMBRO_CS;

      if (existente) {
        const cambios = detectarCambioMontoYVendedor(existente, monto, vendedor, telefonoHoja);
        const necesitaTagCS = esMiembroCS && !(existente.tags ?? []).includes(TAG_MIEMBRO_CS);
        // Si en el CRM sigue en Seguimiento pero la hoja ya lo marca como
        // venta ganada, hay que graduarlo aunque monto/vendedor/teléfono no
        // hayan cambiado — si no, se queda atorado en Seguimiento para
        // siempre porque el sync de seguimientos ya no lo toca (dejó de
        // tener estado "seguimiento"/"apartado" en la hoja).
        const debeGraduar = existente.estado === ESTADOS_CLIENTE.SEGUIMIENTO;
        if (cambios || necesitaTagCS || debeGraduar) {
          const cambioPendiente: CambioPendiente = {
            clienteId: existente.id,
            nombre: existente.nombre,
            correo: existente.email ?? fila.correo,
            monto: cambios?.monto ? { actual: existente.monto, nuevo: cambios.monto } : undefined,
            vendedor: cambios?.vendedor
              ? { actual: existente.vendedor, nuevo: cambios.vendedor }
              : undefined,
            telefono: cambios?.telefono
              ? { actual: existente.telefono, nuevo: cambios.telefono }
              : undefined,
            agregarTagMiembroCS: necesitaTagCS ? true : undefined,
            graduarDeSeguimiento: debeGraduar ? true : undefined,
          };
          // La hoja a veces trae al mismo cliente repetido en varias filas
          // (reingresos, duplicados de captura). Si ya se propuso un cambio
          // para este mismo clienteId en esta corrida, se reemplaza en vez
          // de apilar otra tarjeta idéntica en la revisión del admin.
          const yaExisteIdx = resultado.cambiosPendientes.findIndex(
            (c) => c.clienteId === existente.id
          );
          if (yaExisteIdx >= 0) {
            resultado.cambiosPendientes[yaExisteIdx] = cambioPendiente;
          } else {
            resultado.cambiosPendientes.push(cambioPendiente);
          }
        } else {
          resultado.omitidos++;
        }
      } else {
        // La fecha de la hoja no es confiable (a veces falta o viene mal);
        // la fecha de ingreso real es el momento en que se confirma el alta
        // aquí, no la de la hoja. crearCliente usa "ahora" cuando no se le
        // pasa fechaInscripcion.
        const telefono = telefonoHoja;
        const nuevoIdx = resultado.nuevosPendientes.findIndex((n) => n.correo === fila.correo);
        if (nuevoIdx >= 0) resultado.nuevosPendientes.splice(nuevoIdx, 1);
        resultado.nuevosPendientes.push({
          correo: fila.correo,
          nombre: fila.nombre || fila.correo,
          telefono,
          region,
          vendedor,
          monto,
          tags: esMiembroCS ? [TAG_MIEMBRO_CS] : [],
        });
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
    omitidos: 0,
    errores: [],
    cambiosPendientes: [],
    nuevosPendientes: [],
  };

  for (const hoja of HOJAS) {
    await sincronizarHoja(hoja.region, hoja.sheetId, hoja.gid, resultado);
  }

  return resultado;
}

export type CambioAAplicar = {
  clienteId: string;
  monto?: string;
  vendedor?: string;
  telefono?: string;
  agregarTagMiembroCS?: boolean;
  graduarDeSeguimiento?: boolean;
};

// El admin ya revisó los cambios propuestos y eligió cuáles aplicar; se
// vuelve a leer cada cliente antes de escribir por si cambió algo más
// mientras tanto.
export async function aplicarCambiosPendientes(
  cambios: CambioAAplicar[],
  autor: Autor = AUTOR_SISTEMA
): Promise<{ aplicados: number; errores: string[] }> {
  let aplicados = 0;
  const errores: string[] = [];

  for (const cambio of cambios) {
    try {
      const cliente = await obtenerClientePorId(cambio.clienteId);
      if (!cliente) {
        errores.push(`${cambio.clienteId}: cliente no encontrado`);
        continue;
      }
      const seActualizo = await actualizarMontoYVendedor(
        cliente,
        cambio.monto ?? null,
        cambio.vendedor ?? null,
        cambio.telefono ?? null,
        autor
      );
      let seAplicoTag = false;
      if (cambio.agregarTagMiembroCS && !(cliente.tags ?? []).includes(TAG_MIEMBRO_CS)) {
        await agregarTagsCliente(cliente.id, cliente.nombre, autor, [TAG_MIEMBRO_CS]);
        seAplicoTag = true;
      }
      let seGraduo = false;
      if (cambio.graduarDeSeguimiento) {
        await graduarSeguimientoACliente(cliente.id, cliente.nombre, autor);
        seGraduo = true;
      }
      if (seActualizo || seAplicoTag || seGraduo) aplicados++;
    } catch (err) {
      errores.push(`${cambio.clienteId}: ${err instanceof Error ? err.message : "error desconocido"}`);
    }
  }

  return { aplicados, errores };
}

// El admin ya revisó la lista de clientes nuevos propuestos y eligió
// cuáles crear.
export async function aplicarNuevosPendientes(
  nuevos: NuevoClientePendiente[],
  autor: Autor = AUTOR_SISTEMA
): Promise<{ creados: number; errores: string[] }> {
  let creados = 0;
  const errores: string[] = [];

  for (const nuevo of nuevos) {
    try {
      await crearCliente({
        nombre: nuevo.nombre,
        email: nuevo.correo,
        telefono: nuevo.telefono ?? undefined,
        region: nuevo.region,
        etiquetas: [ETIQUETA_LEGENDARIA],
        tags: nuevo.tags.length > 0 ? nuevo.tags : undefined,
        vendedor: nuevo.vendedor ?? undefined,
        monto: nuevo.monto ?? undefined,
        autor: autor.nombre,
        autorRol: autor.rol,
        origen: "sheet",
      });
      creados++;
    } catch (err) {
      errores.push(`${nuevo.correo}: ${err instanceof Error ? err.message : "error desconocido"}`);
    }
  }

  return { creados, errores };
}

export type ResultadoSyncSeguimientos = {
  creados: number;
  actualizados: number;
  errores: string[];
};

// Estados de la columna M que se llevan como seguimiento en el CRM.
// "apartado" es un seguimiento que ya trae un abono (columna J) — se
// registra como tal, no como el monto total (el total lo completa el
// vendedor a mano cuando lo sepa).
const ESTADOS_SEGUIMIENTO = new Set(["seguimiento", "apartado"]);

// A diferencia del sync de clientes ganados, este escribe directo (sin
// revisión del admin): los leads en seguimiento no son clientes reales
// todavía, así que el riesgo de escribir de más es bajo. Solo toca
// registros cuyo estado siga siendo SEGUIMIENTO; si ya avanzaron (pendiente
// de autorización o cliente real) se dejan intactos aunque la hoja cambie.
export async function sincronizarSeguimientosDesdeHoja(
  autor: Autor = AUTOR_SISTEMA
): Promise<ResultadoSyncSeguimientos> {
  const resultado: ResultadoSyncSeguimientos = { creados: 0, actualizados: 0, errores: [] };

  for (const hoja of HOJAS) {
    const url = `https://docs.google.com/spreadsheets/d/${hoja.sheetId}/export?format=csv&gid=${hoja.gid}`;
    let filas: FilaHoja[];
    try {
      const res = await fetch(url);
      if (!res.ok) {
        resultado.errores.push(`Hoja ${hoja.region}: no se pudo leer (status ${res.status})`);
        continue;
      }
      filas = filasAObjetos(parsearCSV(await res.text()));
    } catch (err) {
      resultado.errores.push(
        `Hoja ${hoja.region}: ${err instanceof Error ? err.message : "error desconocido"}`
      );
      continue;
    }

    for (const fila of filas) {
      const estado = fila.estado.trim().toLowerCase();
      if (!ESTADOS_SEGUIMIENTO.has(estado)) continue;
      if (!fila.correo) continue;

      const esApartado = estado === "apartado";
      // La columna J viene como "$3,997": hay que quitar el signo y las comas
      // antes de convertir a número.
      const abono = Number(fila.amount.replace(/[^0-9.]/g, ""));
      const tieneAbono = esApartado && !Number.isNaN(abono) && abono > 0;

      try {
        const vendedor = resolverVendedor(fila);
        const telefono = limpiarTelefono(fila.corregido, fila.celular, hoja.region, fila.lada);
        const existente = await buscarExistente(fila, telefono);

        if (!existente) {
          const id = await crearCliente({
            nombre: fila.nombre || fila.correo,
            email: fila.correo,
            telefono: telefono ?? undefined,
            region: hoja.region,
            etiquetas: [ETIQUETA_LEGENDARIA],
            vendedor: vendedor ?? undefined,
            autor: autor.nombre,
            autorRol: autor.rol,
            origen: "sheet",
            estadoInicial: ESTADOS_CLIENTE.SEGUIMIENTO,
          });
          if (tieneAbono) {
            await registrarAbono(
              id,
              fila.nombre || fila.correo,
              autor,
              abono,
              MONEDA_POR_REGION[hoja.region] || null,
              "Abono importado desde la hoja de ventas"
            );
          }
          resultado.creados++;
        } else if (existente.estado === ESTADOS_CLIENTE.SEGUIMIENTO) {
          let toco = false;
          if (
            vendedor &&
            normalizarNombre(vendedor) !== normalizarNombre(existente.vendedor ?? "")
          ) {
            await actualizarVendedor(
              existente.id,
              existente.nombre,
              autor,
              vendedor,
              existente.vendedor
            );
            toco = true;
          }
          if (tieneAbono && (existente.totalAbonado ?? 0) === 0) {
            await registrarAbono(
              existente.id,
              existente.nombre,
              autor,
              abono,
              MONEDA_POR_REGION[hoja.region] || null,
              "Abono importado desde la hoja de ventas"
            );
            toco = true;
          }
          if (toco) resultado.actualizados++;
        }
      } catch (err) {
        resultado.errores.push(
          `${fila.correo}: ${err instanceof Error ? err.message : "error desconocido"}`
        );
      }
    }
  }

  return resultado;
}
