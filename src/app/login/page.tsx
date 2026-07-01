"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { KeyRound, UserRound, ArrowUpRight, LoaderCircle, ShieldCheck, Users } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [rol, setRol] = useState<"ADMIN" | "VENDEDOR">("VENDEDOR");
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, rol, clave }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo iniciar sesión.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="bg-brand relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4 py-16">
      <div className="relative w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <div className="relative h-20 w-full max-w-[300px]">
            <Image
              src="/legendar-ia-logo.png"
              alt="Legendar-IA"
              fill
              priority
              className="object-contain drop-shadow-[0_10px_35px_rgba(10,92,255,0.5)]"
            />
          </div>
          <div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Acceso al CRM
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Elige tu perfil, escribe tu nombre y la clave de acceso.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="shell rounded-[2rem] p-2 diffused-lg">
          <div className="core flex flex-col gap-5 rounded-[calc(2rem-0.5rem)] p-8">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setRol("VENDEDOR")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
                  rol === "VENDEDOR"
                    ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                    : "text-muted"
                }`}
              >
                <Users className="h-4 w-4" strokeWidth={1.5} />
                Vendedor
              </button>
              <button
                type="button"
                onClick={() => setRol("ADMIN")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
                  rol === "ADMIN"
                    ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                    : "text-muted"
                }`}
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
                Admin
              </button>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Tu nombre
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 transition-all duration-500 ease-spring focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
                <UserRound className="h-4 w-4 text-muted" strokeWidth={1.5} />
                <input
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Escribe tu nombre"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Clave de acceso
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 transition-all duration-500 ease-spring focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
                <KeyRound className="h-4 w-4 text-muted" strokeWidth={1.5} />
                <input
                  type="password"
                  required
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
                />
              </div>
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex items-center justify-between rounded-full bg-primary py-1 pl-6 pr-1 text-sm font-medium text-white shadow-[0_10px_30px_-8px_rgba(10,92,255,0.55)] transition-all duration-500 ease-spring hover:shadow-[0_14px_36px_-6px_rgba(10,92,255,0.6)] active:scale-[0.98] disabled:opacity-60"
            >
              <span className="py-2">{loading ? "Ingresando…" : "Entrar"}</span>
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
    </main>
  );
}
