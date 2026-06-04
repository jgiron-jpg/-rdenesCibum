import Link from "next/link";
import { AlertTriangle, Clock, Hourglass } from "lucide-react";
import type { AlertaOrden } from "@/types";
import { formatDate } from "@/lib/utils";

const alertConfig = {
  ATRASADO: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Atrasado",
  },
  POR_VENCER: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "Por vencer",
  },
  ESTANCADO_PROD: {
    icon: Hourglass,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    label: "Estancado en Producción",
  },
  ESTANCADO_COM: {
    icon: Hourglass,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    label: "Estancado en Comercial",
  },
};

export function AlertasPanel({ alertas }: { alertas: AlertaOrden[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">
        Alertas Operativas ({alertas.length})
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {alertas.map(({ orden, tipo }) => {
          const cfg = alertConfig[tipo];
          const Icon = cfg.icon;
          return (
            <Link
              key={`${orden.id}-${tipo}`}
              href={`/ordenes/${orden.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${cfg.border} ${cfg.bg} hover:opacity-80 transition-opacity`}
            >
              <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {orden.cliente?.nombre ?? "Cliente sin nombre"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cfg.label} · Entrega: {formatDate(orden.fecha_entrega_comprometida)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
