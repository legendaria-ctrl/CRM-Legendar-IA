"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowUpRight, LoaderCircle, Ticket, Globe2, Layers } from "lucide-react";
import { crearCliente } from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";
import { useCertificacion } from "@/lib/certificacion-context";
import { CERTIFICACIONES } from "@/lib/certificaciones";
import { VendedorSelect } from "@/components/VendedorSelect";
import { REGIONES, REGION_LABEL, Region, beneficiosDeRegion } from "@/lib/constants";

export default function NuevoClientePage() {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!etiquetaTocada.current && certificacionActual) {
      setEtiqueta(certificacionActual.etiqueta);
    }
  }, [certificacionActual]);

  const beneficios = beneficiosDeRegion(region);

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
        autor: sesion.nombre,
        autorRol: sesion.rol,
      });
      router.push(`/clientes/${id}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? `No se pudo registrar el cliente: ${err.message}`
          : "No se pudo registrar el cliente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-block w-fit rounded-full bg-primary-dim px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-deep">
          Alta manual
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Registrar nuevo cliente
        </h1>
        <p className="text-sm text-muted">
          Se agregará a tu lista con estado &quot;Nuevo&quot; hasta que le envíes la invitación.
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

          <div className="flex flex-col gap-2 rounded-2xl bg-primary-dim p-4">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary-deep">
              <Ticket className="h-3.5 w-3.5" strokeWidth={1.5} />
              Beneficios Synergy Unlimited incluidos
            </span>
            <ul className="flex flex-col gap-1">
              {beneficios.map((b, i) => (
                <li key={i} className="text-sm text-primary-deep">
                  {b.cantidad}x {b.tipo} — {b.evento}
                </li>
              ))}
            </ul>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Notas
            </span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Contexto adicional sobre el cliente…"
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
              {loading ? "Guardando…" : "Registrar cliente"}
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
