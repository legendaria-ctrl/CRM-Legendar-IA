import { EstadoCliente, ESTADO_LABEL } from "@/lib/constants";
import { Circle, Send, CheckCircle2, XCircle } from "lucide-react";

const STYLES: Record<EstadoCliente, string> = {
  NUEVO: "bg-silver text-muted",
  INVITACION_ENVIADA: "bg-warning/10 text-warning",
  ACTIVO: "bg-success/10 text-success",
  VENCIDO: "bg-danger/10 text-danger",
};

const ICONS: Record<EstadoCliente, typeof Circle> = {
  NUEVO: Circle,
  INVITACION_ENVIADA: Send,
  ACTIVO: CheckCircle2,
  VENCIDO: XCircle,
};

export function StatusBadge({ estado }: { estado: EstadoCliente }) {
  const Icon = ICONS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${STYLES[estado]}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
