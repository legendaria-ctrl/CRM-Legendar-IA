"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Download, CheckCircle2, XCircle, LoaderCircle, ArrowUpRight } from "lucide-react";
import { parsearCSV, filasAClientes, FilaClienteCSV } from "@/lib/csvParse";
import { descargarCSV } from "@/lib/csv";
import { crearCliente } from "@/lib/clientesService";
import { asegurarTags } from "@/lib/tagsService";
import { useSesion } from "@/lib/session-context";
import { REGION_LABEL, Region } from "@/lib/constants";

export default function ImportarClientesPage() {
  const router = useRouter();
  const { sesion } = useSesion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filas, setFilas] = useState<FilaClienteCSV[] | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState<{ ok: number; error: number } | null>(null);

  function plantilla() {
    descargarCSV(
      "plantilla_clientes.csv",
      [
        "nombre",
        "email",
        "telefono",
        "region",
        "fecha_inscripcion",
        "mensaje_bienvenida",
        "notas",
        "tags",
      ],
      [
        [
          "Juan Pérez",
          "juan@correo.com",
          "555-1234",
          "MX",
          "2026-06-15",
          "si",
          "Contactado en evento",
          "Certificación 2026, VIP",
        ],
      ]
    );
  }

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    setResultado(null);
    const texto = await file.text();
    const filasCrudas = parsearCSV(texto);
    setFilas(filasAClientes(filasCrudas));
  }

  async function importar() {
    if (!filas || !sesion) return;
    const validas = filas.filter((f) => f.valido);
    setImportando(true);
    setProgreso(0);

    let ok = 0;
    let error = 0;

    const todosLosTags = validas.flatMap((f) => f.tags);
    if (todosLosTags.length > 0) {
      await asegurarTags(todosLosTags, sesion.nombre);
    }

    for (const fila of validas) {
      try {
        await crearCliente({
          nombre: fila.nombre,
          email: fila.email,
          telefono: fila.telefono,
          notas: fila.notas,
          region: fila.region,
          fechaInscripcion: fila.fechaInscripcion ?? undefined,
          mensajeBienvenida: fila.mensajeBienvenida,
          tags: fila.tags,
          autor: sesion.nombre,
          autorRol: sesion.rol,
          origen: "csv",
        });
        ok++;
      } catch {
        error++;
      }
      setProgreso((p) => p + 1);
    }

    setImportando(false);
    setResultado({ ok, error });
  }

  const validas = filas?.filter((f) => f.valido).length ?? 0;
  const invalidas = filas ? filas.length - validas : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Alta masiva
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Importar clientes por CSV
        </h1>
        <p className="text-sm text-muted">
          Sube un archivo con columnas nombre, email, telefono, region (MX o US), fecha_inscripcion
          (AAAA-MM-DD), mensaje_bienvenida (si/no), notas y tags (separados por coma).
        </p>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={plantilla}
              className="flex items-center gap-2 rounded-full border border-silver-deep/60 bg-surface-2 px-5 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-primary"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Descargar plantilla
            </button>

            <button
              onClick={() => inputRef.current?.click()}
              className="group flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98]"
            >
              <span className="flex items-center gap-2 py-2">
                <UploadCloud className="h-4 w-4" strokeWidth={1.75} />
                {nombreArchivo || "Elegir archivo CSV"}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleArchivo}
              className="hidden"
            />
          </div>

          {filas && (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                {validas} listos para importar
              </span>
              {invalidas > 0 && (
                <span className="flex items-center gap-1.5 text-danger">
                  <XCircle className="h-4 w-4" strokeWidth={1.75} />
                  {invalidas} con errores (se omitirán)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {filas && filas.length > 0 && (
        <div className="shell rounded-[2rem] p-2 diffused-lg">
          <div className="core rounded-[calc(2rem-0.5rem)] p-2 md:p-3">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-xs uppercase tracking-wider text-muted">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Correo</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Región</th>
                    <th className="px-4 py-3 font-medium">Inscripción</th>
                    <th className="px-4 py-3 font-medium">Bienvenida</th>
                    <th className="px-4 py-3 font-medium">Notas</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver">
                  {filas.map((f, i) => (
                    <tr key={i} className={f.valido ? "" : "bg-danger/5"}>
                      <td className="px-4 py-3 text-foreground">{f.nombre || "—"}</td>
                      <td className="px-4 py-3 text-muted">{f.email || "—"}</td>
                      <td className="px-4 py-3 text-muted">{f.telefono || "—"}</td>
                      <td className="px-4 py-3 text-muted">
                        {f.region ? REGION_LABEL[f.region as Region] : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {f.fechaInscripcion ? f.fechaInscripcion.toLocaleDateString("es-MX") : "Hoy"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            f.mensajeBienvenida ? "bg-success" : "bg-danger"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted">{f.notas || "—"}</td>
                      <td className="px-4 py-3 text-muted">{f.tags.join(", ") || "—"}</td>
                      <td className="px-4 py-3">
                        {f.valido ? (
                          <span className="text-success">Listo</span>
                        ) : (
                          <span className="text-danger">{f.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 p-4">
              <p className="text-xs text-muted">
                {importando && `Importando ${progreso} de ${validas}…`}
                {resultado &&
                  `Importación terminada: ${resultado.ok} creados${
                    resultado.error > 0 ? `, ${resultado.error} con error` : ""
                  }.`}
              </p>
              <div className="flex gap-2">
                {resultado ? (
                  <button
                    onClick={() => router.push("/")}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98]"
                  >
                    Ver clientes
                  </button>
                ) : (
                  <button
                    onClick={importar}
                    disabled={importando || validas === 0}
                    className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
                  >
                    {importando && <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
                    Importar {validas} clientes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
