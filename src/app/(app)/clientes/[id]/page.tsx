"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  suscribirCliente,
  suscribirEventos,
  eliminarCliente,
  agregarTagsCliente,
  quitarTagCliente,
  agregarEtiquetasCliente,
  quitarEtiquetaCliente,
  actualizarVendedor,
  actualizarDatosCliente,
  registrarAbono,
  ClienteDoc,
  EventoDoc,
} from "@/lib/clientesService";
import { estadoActual, estadoBienvenidaDe, aFecha } from "@/lib/membership";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ClientActions } from "@/components/ClientActions";
import { MensajeBienvenidaToggle } from "@/components/MensajeBienvenidaToggle";
import { TagPicker } from "@/components/TagPicker";
import { VendedorSelect } from "@/components/VendedorSelect";
import { CopyButton } from "@/components/CopyButton";
import { suscribirTags, TagDoc } from "@/lib/tagsService";
import {
  Mail,
  Phone,
  User,
  Ticket,
  Globe2,
  Trash2,
  LoaderCircle,
  Tag as TagIcon,
  Layers,
  X,
  Pencil,
  Check,
  MessageCircle,
  DollarSign,
  Lock,
  Plus,
} from "lucide-react";
import { CERTIFICACIONES } from "@/lib/certificaciones";
import {
  REGIONES,
  REGION_LABEL,
  Region,
  beneficiosDeRegion,
  PAPELERA_DIAS,
  ROLES,
  ESTADOS_CLIENTE,
} from "@/lib/constants";
import { useSesion } from "@/lib/session-context";
import { mensajeBienvenida, construirLinkWhatsapp } from "@/lib/whatsapp";

function aFechaInputValue(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { sesion } = useSesion();
  const id = params.id;
  const [eliminando, setEliminando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formEdicion, setFormEdicion] = useState({
    nombre: "",
    email: "",
    telefono: "",
    region: "",
    notas: "",
    monto: "",
    fechaInicio: "",
  });

  const [cliente, setCliente] = useState<ClienteDoc | null | undefined>(undefined);
  const [eventos, setEventos] = useState<EventoDoc[]>([]);
  const [catalogoTags, setCatalogoTags] = useState<TagDoc[]>([]);
  const encabezadoRef = useRef<HTMLDivElement>(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [notaAbono, setNotaAbono] = useState("");
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  useEffect(() => {
    const unsubCliente = suscribirCliente(id, setCliente);
    const unsubEventos = suscribirEventos(id, setEventos);
    const unsubTags = suscribirTags(setCatalogoTags);
    return () => {
      unsubCliente();
      unsubEventos();
      unsubTags();
    };
  }, [id]);

  // Al entrar a la ficha, baja el scroll lo justo para que los datos del
  // cliente queden visibles debajo del encabezado fijo (logo/certificaciones).
  useEffect(() => {
    if (cliente) {
      encabezadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [cliente?.id]);

  if (cliente === undefined) {
    return <div className="py-16 text-center text-sm text-muted">Cargando cliente…</div>;
  }

  if (cliente === null) {
    return <div className="py-16 text-center text-sm text-muted">Este cliente ya no existe.</div>;
  }

  const estado = estadoActual(cliente);
  const fechaLlegada = aFecha(cliente.fechaLlegada);
  const fechaVencimiento = aFecha(cliente.fechaVencimiento);
  const fechaPausa = aFecha(cliente.fechaPausa);
  const beneficios = beneficiosDeRegion(cliente.region);

  const esSeguimiento = cliente.estado === ESTADOS_CLIENTE.SEGUIMIENTO;
  const esPendiente = cliente.estado === ESTADOS_CLIENTE.PENDIENTE_AUTORIZACION;
  const esDueño =
    !!sesion && (sesion.nombre === cliente.creadoPor || sesion.nombre === cliente.vendedor);
  const puedeEditar = sesion?.rol === ROLES.ADMIN || (esSeguimiento && esDueño);
  const totalApartado = cliente.monto ? Number(cliente.monto) : null;
  const restante =
    totalApartado !== null && !Number.isNaN(totalApartado)
      ? totalApartado - (cliente.totalAbonado ?? 0)
      : null;

  async function handleAgregarAbono() {
    if (!sesion || !cliente || guardandoAbono) return;
    const monto = Number(montoAbono);
    if (!monto || monto <= 0) return;
    setGuardandoAbono(true);
    try {
      await registrarAbono(
        cliente.id,
        cliente.nombre,
        { nombre: sesion.nombre, rol: sesion.rol },
        monto,
        notaAbono.trim() || undefined
      );
      setMontoAbono("");
      setNotaAbono("");
    } finally {
      setGuardandoAbono(false);
    }
  }

  async function handleAgregarTags(tags: string[]) {
    if (!sesion || !cliente) return;
    await agregarTagsCliente(cliente.id, cliente.nombre, { nombre: sesion.nombre, rol: sesion.rol }, tags);
  }

  async function handleQuitarTag(tag: string) {
    if (!sesion || !cliente) return;
    await quitarTagCliente(cliente.id, cliente.nombre, { nombre: sesion.nombre, rol: sesion.rol }, tag);
  }

  async function handleAgregarEtiqueta(etiqueta: string) {
    if (!sesion || !cliente) return;
    await agregarEtiquetasCliente(
      cliente.id,
      cliente.nombre,
      { nombre: sesion.nombre, rol: sesion.rol },
      [etiqueta]
    );
  }

  async function handleQuitarEtiqueta(etiqueta: string) {
    if (!sesion || !cliente) return;
    await quitarEtiquetaCliente(
      cliente.id,
      cliente.nombre,
      { nombre: sesion.nombre, rol: sesion.rol },
      etiqueta
    );
  }

  async function handleCambiarVendedor(vendedor: string | null) {
    if (!sesion || !cliente) return;
    await actualizarVendedor(cliente.id, cliente.nombre, { nombre: sesion.nombre, rol: sesion.rol }, vendedor);
  }

  function abrirEdicion() {
    if (!cliente) return;
    const llegada = aFecha(cliente.fechaLlegada);
    setFormEdicion({
      nombre: cliente.nombre,
      email: cliente.email ?? "",
      telefono: cliente.telefono ?? "",
      region: cliente.region ?? "",
      notas: cliente.notas ?? "",
      monto: cliente.monto ?? "",
      fechaInicio: llegada ? aFechaInputValue(llegada) : "",
    });
    setEditando(true);
  }

  async function handleGuardarEdicion() {
    if (!sesion || !cliente || !formEdicion.nombre.trim() || guardando) return;
    setGuardando(true);
    try {
      await actualizarDatosCliente(
        cliente.id,
        cliente.nombre,
        { nombre: sesion.nombre, rol: sesion.rol },
        formEdicion
      );
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar() {
    if (!sesion || !cliente) return;
    const confirmado = window.confirm(
      `¿Enviar a "${cliente.nombre}" a la papelera? Podrás restaurarlo desde ahí durante ${PAPELERA_DIAS} días.`
    );
    if (!confirmado) return;

    setEliminando(true);
    try {
      await eliminarCliente(cliente.id, cliente.nombre, {
        nombre: sesion.nombre,
        rol: sesion.rol,
      });
      router.push("/");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={encabezadoRef}
        className="shell scroll-mt-[210px] rounded-[2rem] p-2 diffused-lg md:scroll-mt-[150px]"
      >
        <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6 md:flex-row md:items-center md:justify-between">
          {editando ? (
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge estado={estado} />
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Editando datos
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Nombre
                  </span>
                  <input
                    value={formEdicion.nombre}
                    onChange={(e) =>
                      setFormEdicion((f) => ({ ...f, nombre: e.target.value }))
                    }
                    className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Correo
                  </span>
                  <input
                    value={formEdicion.email}
                    onChange={(e) =>
                      setFormEdicion((f) => ({ ...f, email: e.target.value }))
                    }
                    className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Teléfono
                  </span>
                  <input
                    value={formEdicion.telefono}
                    onChange={(e) =>
                      setFormEdicion((f) => ({ ...f, telefono: e.target.value }))
                    }
                    className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Región
                  </span>
                  <select
                    value={formEdicion.region}
                    onChange={(e) =>
                      setFormEdicion((f) => ({ ...f, region: e.target.value }))
                    }
                    className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50"
                  >
                    <option value="">Sin región</option>
                    {(Object.keys(REGIONES) as Region[]).map((r) => (
                      <option key={r} value={r}>
                        {REGION_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Monto pagado
                  </span>
                  <input
                    value={formEdicion.monto}
                    onChange={(e) =>
                      setFormEdicion((f) => ({ ...f, monto: e.target.value }))
                    }
                    placeholder="$3,997 MXN"
                    className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Fecha de inicio
                  </span>
                  <input
                    type="date"
                    value={formEdicion.fechaInicio}
                    onChange={(e) =>
                      setFormEdicion((f) => ({ ...f, fechaInicio: e.target.value }))
                    }
                    className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Notas
                  </span>
                  <textarea
                    value={formEdicion.notas}
                    onChange={(e) =>
                      setFormEdicion((f) => ({ ...f, notas: e.target.value }))
                    }
                    rows={2}
                    className="resize-none rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGuardarEdicion}
                  disabled={guardando || !formEdicion.nombre.trim()}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
                >
                  {guardando ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Check className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  Guardar
                </button>
                <button
                  onClick={() => setEditando(false)}
                  disabled={guardando}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-danger disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge estado={estado} />
                  {puedeEditar ? (
                    <button
                      onClick={abrirEdicion}
                      className="flex items-center gap-1.5 rounded-full border border-silver-deep/60 px-3 py-1 text-xs font-medium text-muted transition-colors duration-200 hover:border-primary/50 hover:text-primary"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={2} />
                      Editar
                    </button>
                  ) : (
                    esPendiente && (
                      <span className="flex items-center gap-1.5 rounded-full bg-silver px-3 py-1 text-xs font-medium text-muted">
                        <Lock className="h-3 w-3" strokeWidth={2} />
                        En revisión, bloqueado para ti
                      </span>
                    )
                  )}
                </div>
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
                  {cliente.nombre}
                  {(cliente.etiquetas ?? []).map((etiqueta) => {
                    const cert = CERTIFICACIONES.find((c) => c.etiqueta === etiqueta);
                    return (
                      <span
                        key={etiqueta}
                        className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
                          cert?.color ?? "bg-silver text-muted"
                        }`}
                      >
                        {cert?.nombre ?? etiqueta}
                      </span>
                    );
                  })}
                </h1>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                  {cliente.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {cliente.email}
                      <CopyButton valor={cliente.email} />
                    </span>
                  )}
                  {cliente.telefono && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {cliente.telefono}
                      <CopyButton valor={cliente.telefono} />
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Agregado por: {cliente.creadoPor}
                  </span>
                  {cliente.region && (
                    <span className="flex items-center gap-1.5">
                      <Globe2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {REGION_LABEL[cliente.region as Region] ?? cliente.region}
                    </span>
                  )}
                </div>
                {cliente.notas && (
                  <p className="mt-3 max-w-xl text-sm text-muted">{cliente.notas}</p>
                )}
              </div>

              <div className="flex flex-none flex-col items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Bienvenida WA Soporte
                </span>
                <MensajeBienvenidaToggle
                  clienteId={cliente.id}
                  clienteNombre={cliente.nombre}
                  estado={estadoBienvenidaDe(cliente.mensajeBienvenida)}
                />
                {cliente.telefono && (
                  <a
                    href={construirLinkWhatsapp(
                      cliente.telefono,
                      mensajeBienvenida(cliente.nombre),
                      cliente.region
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success transition-all duration-500 ease-spring hover:bg-success/25 active:scale-[0.98]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                    Enviar bienvenida por WhatsApp
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-wrap items-center gap-3 rounded-[calc(2rem-0.5rem)] p-6 sm:flex-nowrap sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Vendedor</span>
            <VendedorSelect
              valor={cliente.vendedor}
              onChange={handleCambiarVendedor}
              disabled={!puedeEditar}
            />
          </div>
          {cliente.monto && (
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Monto</span>
              <span className="flex items-center gap-1 text-sm font-medium text-success">
                <DollarSign className="h-3.5 w-3.5" strokeWidth={1.5} />
                {cliente.monto}
              </span>
            </div>
          )}
        </div>
      </div>

      {(esSeguimiento || esPendiente) && cliente.monto && (
        <div className="shell rounded-[2rem] p-2 diffused-lg">
          <div className="core flex flex-col gap-4 rounded-[calc(2rem-0.5rem)] p-6">
            <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-muted">
              Total / Abonos / Restante
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-surface-2 px-3 py-3">
                <p className="text-xs text-muted">Total</p>
                <p className="text-sm font-semibold text-foreground">{cliente.monto}</p>
              </div>
              <div className="rounded-2xl bg-surface-2 px-3 py-3">
                <p className="text-xs text-muted">Abonado</p>
                <p className="text-sm font-semibold text-success">
                  ${(cliente.totalAbonado ?? 0).toLocaleString("es-MX")}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-2 px-3 py-3">
                <p className="text-xs text-muted">Restante</p>
                <p className="text-sm font-semibold text-foreground">
                  {restante !== null ? `$${restante.toLocaleString("es-MX")}` : "—"}
                </p>
              </div>
            </div>

            {puedeEditar && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  min={1}
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  placeholder="Monto del abono"
                  className="flex-1 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />
                <input
                  value={notaAbono}
                  onChange={(e) => setNotaAbono(e.target.value)}
                  placeholder="Nota (opcional)"
                  className="flex-1 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-500 ease-spring placeholder:text-muted/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />
                <button
                  onClick={handleAgregarAbono}
                  disabled={guardandoAbono || !montoAbono.trim()}
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
                >
                  {guardandoAbono ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  Agregar abono
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-wrap items-center gap-2 rounded-[calc(2rem-0.5rem)] p-6">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted">Tags</span>
          {(cliente.tags ?? []).map((tag) => {
            const color = catalogoTags.find((t) => t.nombre === tag)?.color ?? "bg-silver text-muted";
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}
              >
                <TagIcon className="h-3 w-3" strokeWidth={2} />
                {tag}
                {puedeEditar && (
                  <button
                    onClick={() => handleQuitarTag(tag)}
                    className="ml-0.5 rounded-full p-0.5 transition-colors duration-200 hover:bg-black/10"
                    title="Quitar tag"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                )}
              </span>
            );
          })}
          {puedeEditar && (
            <TagPicker seleccionados={cliente.tags ?? []} onAgregar={handleAgregarTags} />
          )}
        </div>
      </div>

      <div className="shell rounded-[2rem] p-2 diffused-lg">
        <div className="core flex flex-wrap items-center gap-2 rounded-[calc(2rem-0.5rem)] p-6">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted">
            Certificaciones
          </span>
          {(cliente.etiquetas ?? []).length === 0 ? (
            <span className="rounded-full bg-silver px-3 py-1 text-xs font-medium text-muted">
              No asignados
            </span>
          ) : (
            (cliente.etiquetas ?? []).map((etiqueta) => {
              const cert = CERTIFICACIONES.find((c) => c.etiqueta === etiqueta);
              return (
                <span
                  key={etiqueta}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    cert?.color ?? "bg-silver text-muted"
                  }`}
                >
                  <Layers className="h-3 w-3" strokeWidth={2} />
                  {cert?.nombre ?? etiqueta}
                  {puedeEditar && (
                    <button
                      onClick={() => handleQuitarEtiqueta(etiqueta)}
                      className="ml-0.5 rounded-full p-0.5 transition-colors duration-200 hover:bg-black/10"
                      title="Quitar de esta certificación"
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  )}
                </span>
              );
            })
          )}
          {puedeEditar &&
            CERTIFICACIONES.filter((c) => !(cliente.etiquetas ?? []).includes(c.etiqueta)).map(
            (cert) => (
              <button
                key={cert.id}
                onClick={() => handleAgregarEtiqueta(cert.etiqueta)}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-silver-deep/60 px-3 py-1 text-xs font-medium text-muted transition-colors duration-200 hover:border-primary/50 hover:text-primary"
              >
                <Layers className="h-3 w-3" strokeWidth={2} />
                Agregar a {cert.nombre}
              </button>
            )
          )}
        </div>
      </div>

      {beneficios.length > 0 && (
        <div className="shell rounded-[2rem] p-2 diffused-lg">
          <div className="core flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] p-6">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.15em] text-muted">
              <Ticket className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Beneficios Synergy Unlimited
            </h3>
            <ul className="flex flex-col gap-2">
              {beneficios.map((b, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-primary-dim px-4 py-2.5 text-sm text-primary-deep"
                >
                  <span>{b.evento}</span>
                  <span className="font-medium">
                    {b.cantidad}x {b.tipo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ClientActions
        clienteId={cliente.id}
        clienteNombre={cliente.nombre}
        clienteCorreo={cliente.email}
        estado={estado}
        pausada={cliente.pausada}
        fechaVencimiento={fechaVencimiento}
        fechaPausa={fechaPausa}
      />

      {fechaLlegada && fechaVencimiento && (
        <CountdownTimer
          fechaInicio={fechaLlegada.toISOString()}
          fechaVencimiento={fechaVencimiento.toISOString()}
          pausada={cliente.pausada}
          fechaPausa={fechaPausa?.toISOString() ?? null}
        />
      )}

      <Timeline
        eventos={eventos.map((e) => ({
          id: e.id,
          tipo: e.tipo,
          fecha: aFecha(e.fecha)?.toISOString() ?? null,
          nota: e.nota,
          autor: e.autor,
        }))}
      />

      {puedeEditar && (
        <div className="shell rounded-[2rem] p-2 diffused-lg">
          <div className="core flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">
                {esSeguimiento ? "Eliminar seguimiento" : "Eliminar cliente"}
              </h3>
              <p className="text-sm text-muted">
                Se envía a la papelera por {PAPELERA_DIAS} días. Desde ahí se puede restaurar tal
                como estaba o eliminar definitivamente.
              </p>
            </div>
            <button
              onClick={handleEliminar}
              disabled={eliminando}
              className="flex items-center gap-2 rounded-full bg-danger/10 px-5 py-2.5 text-sm font-medium text-danger transition-all duration-500 ease-spring hover:bg-danger/20 active:scale-[0.98] disabled:opacity-50"
            >
              {eliminando ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              )}
              Eliminar cliente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
