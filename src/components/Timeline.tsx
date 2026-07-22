import { EVENTO_LABEL, TipoEvento } from "@/lib/constants";
import {
  UserPlus,
  Send,
  CheckCircle2,
  RefreshCcw,
  XCircle,
  StickyNote,
  Trash2,
  UploadCloud,
  MessageCircle,
  Undo2,
  Pause,
  Play,
  CalendarPlus,
  Tag,
  UserCheck,
  Layers,
  Pencil,
  Recycle,
  RotateCcw,
  DollarSign,
  Hourglass,
  ShieldCheck,
} from "lucide-react";

const ICONS: Record<TipoEvento, typeof UserPlus> = {
  LLEGADA: UserPlus,
  INVITACION_ENVIADA: Send,
  INVITACION_ACEPTADA: CheckCircle2,
  RENOVACION: RefreshCcw,
  VENCIMIENTO: XCircle,
  NOTA: StickyNote,
  ELIMINACION: Trash2,
  IMPORTACION: UploadCloud,
  MENSAJE_BIENVENIDA: MessageCircle,
  RESTAURACION: Undo2,
  PAUSA: Pause,
  REANUDACION: Play,
  EXTENSION: CalendarPlus,
  TAGS: Tag,
  VENDEDOR: UserCheck,
  ETIQUETAS: Layers,
  EDICION: Pencil,
  PAPELERA: Recycle,
  RESTAURACION_PAPELERA: RotateCcw,
  ELIMINACION_PERMANENTE: Trash2,
  ABONO: DollarSign,
  ENVIO_REVISION: Hourglass,
  AUTORIZACION: ShieldCheck,
};

export type EventoTimelineItem = {
  id: string;
  tipo: string;
  fecha: string | null;
  nota: string | null;
  autor?: string;
};

export function Timeline({ eventos }: { eventos: EventoTimelineItem[] }) {
  return (
    <div className="shell rounded-[2rem] p-2 diffused-lg">
      <div className="core rounded-[calc(2rem-0.5rem)] p-6">
        <h3 className="mb-6 text-sm font-medium uppercase tracking-[0.15em] text-muted">
          Línea de tiempo
        </h3>

        <ol className="relative flex flex-col gap-6 pl-2">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-silver" />

          {eventos.map((evento) => {
            const Icon = ICONS[evento.tipo as TipoEvento] ?? StickyNote;
            return (
              <li key={evento.id} className="relative flex gap-4">
                <div className="relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface ring-4 ring-primary-dim">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1 pb-1 pt-1">
                  <p className="text-sm font-medium text-foreground">
                    {EVENTO_LABEL[evento.tipo as TipoEvento] ?? evento.tipo}
                  </p>
                  {evento.nota && (
                    <p className="mt-0.5 text-sm text-muted">{evento.nota}</p>
                  )}
                  <p className="mt-1 text-xs text-muted/70">
                    {evento.fecha
                      ? new Date(evento.fecha).toLocaleString("es-MX", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Guardando…"}
                    {evento.autor && ` · ${evento.autor}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
