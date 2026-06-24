"use client";

import { useMemo } from "react";
import type { Orden } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatQ, detectarAlertas, labelEstado } from "@/lib/utils";
import {
  differenceInHours,
  startOfWeek,
  format,
  subWeeks,
  isWithinInterval,
  endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { Download } from "lucide-react";

const COLORS = ["#f59e0b", "#6366f1", "#06b6d4", "#22c55e", "#ef4444", "#a855f7"];

export function ReportesClient({ ordenes }: { ordenes: Orden[] }) {
  const alertas = detectarAlertas(ordenes);

  const hoy = new Date();

  const stats = useMemo(() => {
    const entregadas = ordenes.filter((o) => o.estado_comercial === "ENTREGADO");
    const tiemposHoras = entregadas
      .filter((o) => o.fecha_entrega_comprometida)
      .map((o) => differenceInHours(new Date(o.updated_at), new Date(o.fecha_ingreso)));

    const promHoras =
      tiemposHoras.length > 0
        ? tiemposHoras.reduce((a, b) => a + b, 0) / tiemposHoras.length
        : 0;

    const conFechaEntrega = ordenes.filter(
      (o) => o.fecha_entrega_comprometida && o.estado_comercial === "ENTREGADO"
    );
    const aTime = conFechaEntrega.filter(
      (o) => new Date(o.updated_at) <= new Date(o.fecha_entrega_comprometida!)
    ).length;
    const pctCumplimiento =
      conFechaEntrega.length > 0
        ? Math.round((aTime / conFechaEntrega.length) * 100)
        : 0;

    return {
      total: ordenes.length,
      activas: ordenes.filter(
        (o) => !["ENTREGADO", "CANCELADO", "COBRADO"].includes(o.estado_comercial)
      ).length,
      entregadas: entregadas.length,
      canceladas: ordenes.filter((o) => o.estado_comercial === "CANCELADO").length,
      atrasadas: alertas.filter((a) => a.tipo === "ATRASADO").length,
      promHoras: Math.round(promHoras),
      pctCumplimiento,
    };
  }, [ordenes, alertas]);

  // Weekly trend (last 8 weeks)
  const semanal = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const start = startOfWeek(subWeeks(hoy, 7 - i), { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const recibidos = ordenes.filter((o) =>
        isWithinInterval(new Date(o.fecha_ingreso), { start, end })
      ).length;
      const entregados = ordenes.filter(
        (o) =>
          o.estado_comercial === "ENTREGADO" &&
          isWithinInterval(new Date(o.updated_at), { start, end })
      ).length;
      return {
        semana: format(start, "dd/MM", { locale: es }),
        recibidos,
        entregados,
      };
    });
  }, [ordenes]);

  // Estado comercial distribution
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    ordenes.forEach((o) => {
      counts[o.estado_comercial] = (counts[o.estado_comercial] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: labelEstado(name),
      value,
    }));
  }, [ordenes]);

  // Por vendedor
  const porVendedor = useMemo(() => {
    const counts: Record<string, number> = {};
    ordenes.forEach((o) => {
      const v = o.vendedor ?? "Sin asignar";
      counts[v] = (counts[v] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([vendedor, total]) => ({ vendedor, total }))
      .sort((a, b) => b.total - a.total);
  }, [ordenes]);

  async function exportarExcel() {
    const { utils, writeFile } = await import("xlsx");
    const rows = ordenes.map((o) => ({
      "ID Orden": o.id.slice(0, 8),
      Cliente: o.cliente?.nombre ?? "",
      "Estado Producción": o.estado_produccion,
      "Estado Comercial": o.estado_comercial,
      "Fecha Ingreso": o.fecha_ingreso?.slice(0, 10) ?? "",
      "Fecha Entrega": o.fecha_entrega_comprometida ?? "",
      Vendedor: o.vendedor ?? "",
      "Venta De": o.venta_de ?? "",
      "Total Q": o.total_q ?? 0,
      "Total Unidades": o.total_unidades ?? 0,
      Mes: o.mes ?? "",
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Órdenes");
    writeFile(wb, `cibum-ordenes-${format(hoy, "yyyy-MM-dd")}.xlsx`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground text-sm">Indicadores operativos</p>
        </div>
        <button
          onClick={exportarExcel}
          className="flex items-center gap-2 bg-card border border-border hover:border-amber-500/50 text-foreground rounded-lg px-4 py-2.5 text-sm transition-colors"
        >
          <Download className="w-4 h-4 text-amber-400" />
          Exportar Excel
        </button>
      </div>

      {/* KPIs grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total órdenes", value: stats.total, unit: "" },
          { label: "Activas", value: stats.activas, unit: "" },
          { label: "Entregadas", value: stats.entregadas, unit: "" },
          { label: "Canceladas", value: stats.canceladas, unit: "" },
          { label: "Atrasadas", value: stats.atrasadas, unit: "", alert: true },
          { label: "Promedio recepción→entrega", value: stats.promHoras, unit: "h" },
          { label: "% Cumplimiento entregas", value: stats.pctCumplimiento, unit: "%" },
        ].map(({ label, value, unit, alert }) => (
          <div
            key={label}
            className={`bg-card border rounded-xl p-4 ${
              alert && value > 0 ? "border-red-500/30" : "border-border"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-2">{label}</p>
            <p
              className={`text-2xl font-bold ${
                alert && value > 0 ? "text-red-400" : "text-amber-400"
              }`}
            >
              {value}
              {unit}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia semanal */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Recibidos vs Entregados por semana
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={semanal} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="semana" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 47% 16%)", borderRadius: "8px", color: "white", fontSize: 12 }}
              />
              <Bar dataKey="recibidos" name="Recibidos" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="entregados" name="Entregados" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Estado comercial pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Distribución por estado comercial
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 47% 16%)", borderRadius: "8px", color: "white", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "hsl(215 20% 55%)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Por vendedor */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Por vendedor</h3>
        <div className="space-y-2">
          {porVendedor.map(({ vendedor, total }) => (
            <div key={vendedor} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-28 truncate">{vendedor}</span>
              <div className="flex-1 bg-secondary rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${(total / ordenes.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-foreground font-medium w-8 text-right">{total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Alertas operativas activas ({alertas.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Cliente", "Tipo Alerta", "Fecha Entrega", "Estado Prod.", "Estado Com."].map((h) => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alertas.map(({ orden, tipo }) => (
                  <tr key={`${orden.id}-${tipo}`} className="border-b border-border/50">
                    <td className="px-3 py-2 text-foreground">{orden.cliente?.nombre ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                        tipo === "ATRASADO" ? "bg-red-500/10 text-red-300 border-red-500/20" : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                      }`}>
                        {tipo.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{orden.fecha_entrega_comprometida ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{labelEstado(orden.estado_produccion)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{labelEstado(orden.estado_comercial)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
