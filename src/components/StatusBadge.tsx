import { EstadoCliente, ESTADO_LABEL } from "@/lib/constants";
import { Circle, Send, CheckCircle2, XCircle, Clock, Hourglass } from "lucide-react";

const STYLES: Record<EstadoCliente, string> = {
  SEGUIMIENTO: "bg-cyan-500/10 text-cyan-600",
  PENDIENTE_AUTORIZACION: "bg-purple-500/10 text-purple-600",
  NUEVO: "bg-silver text-muted",
  INVITACION_ENVIADA: "bg-warning/10 text-warning",
  ACTIVO: "bg-success/10 text-success",
  VENCIDO: "bg-danger/10 text-danger",
};

const ICONS: Record<EstadoCliente, typeof Circle> = {
  SEGUIMIENTO: Clock,
  PENDIENTE_AUTORIZACION: Hourglass,
  NUEVO: Circle,
  INVITACION_ENVIADA: Send,
  ACTIVO: CheckCircle2,
  VENCIDO: XCircle,
};

export function StatusBadge({
  estado,
  onClick,
  cargando = false,
  title,
}: {
  estado: EstadoCliente;
  onClick?: (e: React.MouseEvent) => void;
  cargando?: boolean;
  title?: string;
}) {
  const Icon = ICONS[estado];
  const clases = `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${STYLES[estado]}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!cargando) onClick(e);
        }}
        disabled={cargando}
        title={title}
        className={`${clases} transition-transform duration-500 ease-spring active:scale-95 disabled:cursor-not-allowed disabled:opacity-70`}
      >
        <Icon className="h-3 w-3" strokeWidth={2} />
        {ESTADO_LABEL[estado]}
      </button>
    );
  }

  return (
    <span className={clases}>
      <Icon className="h-3 w-3" strokeWidth={2} />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
