import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isAfter, isBefore, addDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import type { Orden, AlertType, AlertaOrden } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatQ(amount: number | null) {
  if (amount === null || amount === undefined) return "Q 0.00";
  return `Q ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function formatDate(date: string | null) {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy", { locale: es });
}

export function formatDateTime(date: string | null) {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
}

export function getMesActual() {
  return format(new Date(), "MMMM yyyy", { locale: es }).toUpperCase();
}

export function detectarAlertas(ordenes: Orden[]): AlertaOrden[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const alertas: AlertaOrden[] = [];

  for (const orden of ordenes) {
    const estadoFinal = ["ENTREGADO", "CANCELADO", "COBRADO"];
    if (estadoFinal.includes(orden.estado_comercial)) continue;

    if (orden.fecha_entrega_comprometida) {
      const fechaEntrega = new Date(orden.fecha_entrega_comprometida);

      if (isBefore(fechaEntrega, hoy)) {
        alertas.push({ orden, tipo: "ATRASADO" });
        continue;
      }

      if (
        isAfter(fechaEntrega, hoy) &&
        isBefore(fechaEntrega, addDays(hoy, 3))
      ) {
        alertas.push({ orden, tipo: "POR_VENCER" });
        continue;
      }
    }

    const fechaIngreso = new Date(orden.fecha_ingreso);
    if (
      orden.estado_produccion === "RECIBIDO" &&
      differenceInDays(hoy, fechaIngreso) > 3
    ) {
      alertas.push({ orden, tipo: "ESTANCADO_PROD" });
      continue;
    }

    if (orden.estado_comercial === "FACTURADO") {
      const updated = new Date(orden.updated_at);
      if (differenceInDays(hoy, updated) > 2) {
        alertas.push({ orden, tipo: "ESTANCADO_COM" });
      }
    }
  }

  return alertas;
}

export const ESTADOS_PRODUCCION = [
  "RECIBIDO",
  "EN_PREPARACION",
  "EMPACADO",
  "ENVIADO",
] as const;

export const ESTADOS_COMERCIAL = [
  "PENDIENTE",
  "FACTURADO",
  "ENTREGADO",
  "COBRADO",
  "CANCELADO",
] as const;

export const VENDEDORES = ["KEVIN", "OSMAN", "ESTUARDO"];
export const MEDIOS_ENVIO = ["FORZA", "PINGUE", "ERICKA", "CAEX", "OTRO"];
export const METODOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA"];
export const FORMAS_PAGO = ["CONTADO", "CREDITO"];
export const VENTA_A_OPTIONS = ["PUNTO DE VENTA", "CLIENTE REDES SOCIALES"];
export const VENTA_DE_OPTIONS = [
  "MR.BEEF",
  "CIBUM",
  "JERKY DEALERS",
  "JACK LINKS",
];
export const MEDIO_CONTACTO_OPTIONS = [
  "WHATSAPP",
  "INSTAGRAM",
  "PUNTO DE VENTA",
  "OTRO",
];

export function colorEstadoProduccion(estado: string) {
  const map: Record<string, string> = {
    RECIBIDO: "bg-foreground/5 text-foreground/60 border-foreground/10",
    EN_PREPARACION: "bg-foreground/10 text-foreground/80 border-foreground/20",
    EMPACADO: "bg-foreground/20 text-foreground border-foreground/30",
    ENVIADO: "bg-foreground text-background border-foreground",
  };
  return map[estado] ?? "bg-foreground/5 text-foreground/60 border-foreground/10";
}

export function colorEstadoComercial(estado: string) {
  const map: Record<string, string> = {
    PENDIENTE: "bg-foreground/5 text-foreground/60 border-foreground/10",
    FACTURADO: "bg-foreground/10 text-foreground/70 border-foreground/15",
    GESTION_PROGRAMADA: "bg-foreground/15 text-foreground/80 border-foreground/20",
    GUIA_GENERADA: "bg-foreground/20 text-foreground/85 border-foreground/25",
    ENVIADO: "bg-foreground/30 text-foreground border-foreground/40",
    ENTREGADO: "bg-foreground text-background border-foreground",
    CANCELADO: "bg-red-500/15 text-red-500 border-red-500/30",
    COBRADO: "bg-foreground text-background border-foreground",
  };
  return map[estado] ?? "bg-foreground/5 text-foreground/60 border-foreground/10";
}

export function labelEstado(estado: string) {
  const map: Record<string, string> = {
    RECIBIDO: "Recibido",
    EN_PREPARACION: "En Preparación",
    EMPACADO: "Empacado",
    ENVIADO: "Enviado",
    PENDIENTE: "Pendiente",
    FACTURADO: "Facturado",
    GESTION_PROGRAMADA: "Gestión Prog.",
    GUIA_GENERADA: "Guía Generada",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",
    COBRADO: "Cobrado",
  };
  return map[estado] ?? estado;
}
