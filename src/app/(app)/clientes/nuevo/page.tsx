"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowUpRight, LoaderCircle } from "lucide-react";
import { crearCliente } from "@/lib/clientesService";
import { useSesion } from "@/lib/session-context";

export default function NuevoClientePage() {
  const router = useRouter();
  const { sesion } = useSesion();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sesion) return;
    setLoading(true);
    setError(null);

    try {
      const id = await crearCliente({
        nombre,
        email,
        telefono,
        notas,
        autor: sesion.nombre,
        autorRol: sesion.rol,
      });
      router.push(`/clientes/${id}`);
    } catch {
      setError("No se pudo registrar el cliente.");
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
            disabled={loading}
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
