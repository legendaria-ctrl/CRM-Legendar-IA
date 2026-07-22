"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ArrowUpRight,
  LoaderCircle,
  Globe2,
  Layers,
  DollarSign,
  Tag as TagIcon,
  Plus,
  Search,
  X,
} from "lucide-react";
import { crearCliente } from "@/lib/clientesService";
import { suscribirTags, crearTag, TagDoc } from "@/lib/tagsService";
import { useSesion } from "@/lib/session-context";
import { useCertificacion } from "@/lib/certificacion-context";
import { CERTIFICACIONES } from "@/lib/certificaciones";
import { VendedorSelect } from "@/components/VendedorSelect";
import { REGIONES, REGION_LABEL, Region, ESTADOS_CLIENTE } from "@/lib/constants";

export default function NuevoSeguimientoPage() {
  const router = useRouter();
  const { sesion, cargando } = useSesion();
  const { certificacionActual } = useCertificacion();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [vendedor, setVendedor] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>(REGIONES.MX);
  const [etiqueta, setEtiqueta] = useState<string>(CERTIFICACIONES[0]?.etiqueta ?? "");
  const etiquetaTocada = useRef(false);
  const [total, setTotal] = useState("");
  const [catalogoTags, setCatalogoTags] = useState<TagDoc[]>([]);
  const [tagsAbierto, setTagsAbierto] = useState(false);
  const [busquedaTag, setBusquedaTag] = useState("");
  const [creandoTag, setCreandoTag] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!etiquetaTocada.current && certificacionActual) {
      setEtiqueta(certificacionActual.etiqueta);
    }
  }, [certificacionActual]);

  useEffect(() => {
    const unsub = suscribirTags(setCatalogoTags);
    return () => unsub();
  }, []);

  const tagsDisponibles = catalogoTags.filter((t) => !tags.includes(t.nombre));
  const tagsFiltrados = tagsDisponibles.filter((t) =>
    t.nombre.toLowerCase().includes(busquedaTag.trim().toLowerCase())
  );
  const coincideExacto = tagsDisponibles.some(
    (t) => t.nombre.toLowerCase() === busquedaTag.trim().toLowerCase()
  );
  const puedeCrearTag = busquedaTag.trim() !== "" && !coincideExacto;

  function agregarTagLocal(nombre: string) {
    setTags((t) => (t.includes(nombre) ? t : [...t, nombre]));
    setBusquedaTag("");
  }

  async function crearYAgregarTag() {
    if (!sesion || creandoTag || !busquedaTag.trim()) return;
    setCreandoTag(true);
    try {
      const tag = await crearTag(busquedaTag, sesion.nombre);
      if (tag) agregarTagLocal(tag.nombre);
    } finally {
      setCreandoTag(false);
    }
  }

  function quitarTagLocal(tag: string) {
    setTags((t) => t.filter((x) => x !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sesion) {
      setError("No se detectó tu sesión. Recarga la página e inicia sesión de nuevo.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const id = await crearCliente({
        nombre,
        email,
        telefono,
        notas,
        vendedor: vendedor ?? undefined,
        region,
        etiquetas: etiqueta ? [etiqueta] : [],
        tags,
        monto: total,
        autor: sesion.nombre,
        autorRol: sesion.rol,
        estadoInicial: ESTADOS_CLIENTE.SEGUIMIENTO,
      });
      router.push(`/clientes/${id}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? `No se pudo registrar el seguimiento: ${err.message}`
          : "No se pudo registrar el seguimiento."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-cyan-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-600">
          Nuevo seguimiento
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Registrar apartado
        </h1>
        <p className="text-sm text-muted">
          Llévale el seguimiento a sus abonos. Cuando termine de pagar, envíalo a autorización
          desde su perfil.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-5 rounded-[calc(2rem-0.5rem)] p-8">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Nombre completo *
            </span>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Correo
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@correo.com"
              className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Teléfono
            </span>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+52 55 1234 5678"
              className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Vendedor
            </span>
            <VendedorSelect valor={vendedor} onChange={setVendedor} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
              <DollarSign className="h-3.5 w-3.5" strokeWidth={1.5} />
              Monto total
            </span>
            <input
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="$3,997 MXN"
              className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
              <TagIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
              Tags
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => {
                const color =
                  catalogoTags.find((t) => t.nombre === tag)?.color ?? "bg-silver text-muted";
                return (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}
                  >
                    <TagIcon className="h-3 w-3" strokeWidth={2} />
                    {tag}
                    <button
                      type="button"
                      onClick={() => quitarTagLocal(tag)}
                      className="ml-0.5 rounded-full p-0.5 transition-colors duration-200 hover:bg-black/10"
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </span>
                );
              })}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTagsAbierto((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-silver-deep/60 px-3 py-1.5 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:border-primary/50 hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Agregar tag
                </button>

                {tagsAbierto && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setTagsAbierto(false)}
                    />
                    <div className="animate-fade-in absolute z-40 mt-2 w-64 rounded-2xl border border-silver-deep/60 bg-surface p-2 shadow-2xl">
                      <div className="mb-2 flex items-center gap-2 rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2">
                        <Search className="h-3.5 w-3.5 flex-none text-muted" strokeWidth={1.75} />
                        <input
                          autoFocus
                          value={busquedaTag}
                          onChange={(e) => setBusquedaTag(e.target.value)}
                          placeholder="Buscar o crear tag…"
                          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
                        />
                        <button
                          type="button"
                          onClick={() => setTagsAbierto(false)}
                          className="flex-none rounded-full p-0.5 text-muted transition-colors duration-200 hover:bg-black/10"
                          title="Cerrar"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {tagsFiltrados.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => agregarTagLocal(tag.nombre)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors duration-200 hover:bg-primary-dim"
                          >
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${tag.color}`}
                            >
                              <TagIcon className="h-2.5 w-2.5" strokeWidth={2} />
                              {tag.nombre}
                            </span>
                          </button>
                        ))}
                        {tagsFiltrados.length === 0 && !puedeCrearTag && (
                          <p className="px-3 py-2 text-xs text-muted">Sin resultados.</p>
                        )}
                        {puedeCrearTag && (
                          <button
                            type="button"
                            onClick={crearYAgregarTag}
                            disabled={creandoTag}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary-dim disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                            Crear &quot;{busquedaTag.trim()}&quot;
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Certificación
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
              {CERTIFICACIONES.map((cert) => (
                <button
                  key={cert.id}
                  type="button"
                  onClick={() => {
                    etiquetaTocada.current = true;
                    setEtiqueta(cert.etiqueta);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
                    etiqueta === cert.etiqueta
                      ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                      : "text-muted"
                  }`}
                >
                  <Layers className="h-4 w-4" strokeWidth={1.5} />
                  {cert.nombre}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Región
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
              {(Object.keys(REGIONES) as Region[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-medium leading-tight transition-all duration-500 ease-spring sm:flex-row sm:gap-2 ${
                    region === r
                      ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                      : "text-muted"
                  }`}
                >
                  <Globe2 className="h-4 w-4" strokeWidth={1.5} />
                  <span className="text-center sm:hidden">
                    Legendar-IA
                    <br />
                    {r}
                  </span>
                  <span className="hidden sm:inline">{REGION_LABEL[r]}</span>
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Notas
            </span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Contexto adicional sobre el apartado…"
              rows={3}
              className="resize-none rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading || cargando}
            className="group mt-2 flex items-center justify-between rounded-full bg-primary py-1 pl-6 pr-1 text-sm font-medium text-white shadow-[0_10px_30px_-8px_rgba(10,92,255,0.55)] transition-all duration-500 ease-spring hover:shadow-[0_14px_36px_-6px_rgba(10,92,255,0.6)] active:scale-[0.98] disabled:opacity-60"
          >
            <span className="flex items-center gap-2 py-2">
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              {loading ? "Guardando…" : "Registrar seguimiento"}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1 group-hover:-translate-y-[1px]">
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
              )}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
