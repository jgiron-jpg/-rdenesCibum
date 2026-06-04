import { Package, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { KPIs } from "@/types";

export function KPICards({ kpis }: { kpis: KPIs }) {
  const cards = [
    {
      label: "Pedidos Activos",
      value: kpis.activos,
      icon: Package,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Pendientes",
      value: kpis.pendientes,
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Atrasados",
      value: kpis.atrasados,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      label: "Entregados esta semana",
      value: kpis.entregadosSemana,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg, border }) => (
        <div
          key={label}
          className={`bg-card border ${border} rounded-xl p-4`}
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <div className={`${bg} p-2 rounded-lg`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
