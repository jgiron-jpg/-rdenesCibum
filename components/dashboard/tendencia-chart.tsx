"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Orden } from "@/types";

export function TendenciaChart({ ordenes }: { ordenes: Orden[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 13 - i));
    const count = ordenes.filter((o) => {
      const d = startOfDay(new Date(o.fecha_ingreso));
      return d.getTime() === date.getTime();
    }).length;
    return {
      dia: format(date, "dd/MM", { locale: es }),
      pedidos: count,
    };
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Pedidos recibidos (últimas 2 semanas)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={days} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
          <XAxis
            dataKey="dia"
            tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
            axisLine={{ stroke: "hsl(222 47% 16%)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222 47% 9%)",
              border: "1px solid hsl(222 47% 16%)",
              borderRadius: "8px",
              color: "white",
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(215 20% 55%)" }}
          />
          <Line
            type="monotone"
            dataKey="pedidos"
            stroke="hsl(38 92% 50%)"
            strokeWidth={2}
            dot={{ fill: "hsl(38 92% 50%)", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
