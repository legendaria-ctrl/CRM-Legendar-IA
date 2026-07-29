"use client";

import { X, CheckCircle2, AlertTriangle } from "lucide-react";

export function ResultadoPopup({
  titulo,
  mensaje,
  tipo = "success",
  onClose,
}: {
  titulo: string;
  mensaje: string;
  tipo?: "success" | "error";
  onClose: () => void;
}) {
  const Icon = tipo === "error" ? AlertTriangle : CheckCircle2;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in-fast" onClick={onClose} />
      <div className="animate-fade-in relative flex w-full max-w-sm flex-col gap-3 rounded-[2rem] bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
              tipo === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
            }`}
          >
            <Icon className="h-3 w-3" strokeWidth={2} />
            {titulo}
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-xl text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm text-foreground">{mensaje}</p>
        <button
          onClick={onClose}
          className="mt-1 self-end rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
