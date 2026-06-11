"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/inventario/admin-guard";
import {
  SKUS, calcularStock, getMinimos, getOptimos, semaforoSku, colorSemaforo,
  consumoPromedioSemanal, diasCobertura,
  type Distribuidor, type Movimiento, type ConfigInventario,
} from "@/lib/inventario";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Loader2, Plus, ClipboardCheck } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, startOfWeek, subWeeks, isWithinInterval, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = ["#f59e0b", "#6366f1", "#06b6d4", "#22c55e", "#ef4444", "#a855f7", "#ec4899"];

function DetalleDistribuidor() {
  const { id } = useParams();
  const [distribuidor, setDistribuidor] = useState<Distribuidor | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [config, setConfig] = useState<ConfigInventario | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: d }, { data: movs }, { data: cfg }] = await Promise.all([
        supabase.from("distribuidores").select("*").eq("id", id).single(),
        supabase.from("inventario_movimientos").select("*").eq("distribuidor_id", id).order("fecha", { ascending: false }),
        supabase.from("inventario_config").select("*").eq("distribuidor_id", id).maybeSingle(),
      ]);
      setDistribuidor(d);
      setMovimientos((movs ?? []) as Movimiento[]);
      setConfig(cfg as ConfigInventario | null);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!distribuidor) {
    return <div className="p-6 text-muted-foreground text-sm">Distribuidor no encontrado.</div>;
  }

  const stock = calcularStock(movimientos);
  const minimos = getMinimos(config);
  const optimos = getOptimos(config);
  const consumo = consumoPromedioSemanal(movimientos);

  // Gráfica: ventas semanales por SKU (últimas 8 semanas)
  const hoy = new Date();
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const start = startOfWeek(subWeeks(hoy, 7 - i), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });
    const punto: Record<string, string | number> = {
      semana: format(start, "dd/MM", { locale: es }),
    };
    for (const sku of SKUS) {
      let ventas = 0;
      for (const m of movimientos) {
        const f = new Date(m.fecha);
        if (!isWithinInterval(f, { start, end })) continue;
        const val = (m[sku.key] as number) ?? 0;
        if (val < 0) ventas += Math.abs(val);
      }
      punto[sku.label] = ventas;
    }
    return punto;
  });

  const movsFiltrados = filtroTipo ? movimientos.filter(m => m.tipo === filtroTipo) : movimientos;
  const tipos = Array.from(new Set(movimientos.map(m => m.tipo)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inventario" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{distribuidor.nombre}</h1>
            <p className="text-muted-foreground text-sm">{distribuidor.zona ?? ""}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/inventario/movimiento/nuevo"
            className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-80 transition-opacity">
            <Plus className="w-4 h-4" /> Movimiento
          </Link>
          <Link href="/inventario/corte"
            className="flex items-center gap-2 border border-border text-foreground text-sm font-semibold rounded-lg px-4 py-2 hover:bg-secondary transition-colors">
            <ClipboardCheck className="w-4 h-4" /> Corte
          </Link>
        </div>
      </div>

      {/* Stock actual + recomendación */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Inventario actual</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["SKU", "Stock", "Mínimo", "Óptimo", "Consumo/sem", "Cobertura", "Reponer"].map(h => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKUS.map(sku => {
                const st = stock[sku.key];
                const s = semaforoSku(st, minimos[sku.key], optimos[sku.key]);
                const cons = consumo[sku.key];
                const dias = diasCobertura(st, cons);
                const reponer = Math.max(0, optimos[sku.key] - st);
                return (
                  <tr key={sku.key} className="border-b border-border/50">
                    <td className="px-4 py-3 text-foreground">{sku.label}
                      <span className="text-xs text-muted-foreground ml-2">{sku.marca}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block min-w-[36px] text-center text-xs px-2 py-1 rounded border font-bold ${colorSemaforo(s)}`}>{st}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{minimos[sku.key]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{optimos[sku.key]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cons.toFixed(1)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {dias === Infinity ? "—" : `${Math.round(dias)} días`}
                    </td>
                    <td className="px-4 py-3">
                      {reponer > 0 ? (
                        <span className="text-foreground font-semibold">+{reponer}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfica de consumo */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Ventas reportadas por semana (últimas 8)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={semanas} margin={{ left: -20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="semana" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {SKUS.map((sku, i) => (
              <Line key={sku.key} type="monotone" dataKey={sku.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Movimientos */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <h3 className="text-sm font-semibold text-foreground">Movimientos ({movsFiltrados.length})</h3>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none">
            <option value="">Todos los tipos</option>
            {tipos.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Fecha</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Tipo</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Ref.</th>
                {SKUS.map(sku => (
                  <th key={sku.key} className="text-center text-xs text-muted-foreground font-medium px-2 py-3">
                    {sku.label.split(" ")[0]}
                  </th>
                ))}
                <th className="text-center text-xs text-muted-foreground font-medium px-3 py-3">Total</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-3 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {movsFiltrados.length === 0 ? (
                <tr><td colSpan={12} className="text-center text-muted-foreground py-8">Sin movimientos</td></tr>
              ) : (
                movsFiltrados.map(m => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{formatDate(m.fecha)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        m.tipo === "ENTREGA" ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : m.tipo === "VENTA_REPORTADA" ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-secondary text-muted-foreground border-border"
                      }`}>
                        {m.tipo.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{m.referencia ?? "—"}</td>
                    {SKUS.map(sku => {
                      const val = (m[sku.key] as number) ?? 0;
                      return (
                        <td key={sku.key} className={`px-2 py-2.5 text-center text-xs font-medium ${
                          val > 0 ? "text-green-500" : val < 0 ? "text-red-400" : "text-muted-foreground/40"
                        }`}>
                          {val > 0 ? `+${val}` : val !== 0 ? val : "·"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-foreground">{m.total_unidades}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{m.estado ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DistribuidorPage() {
  return (
    <AdminGuard>
      <DetalleDistribuidor />
    </AdminGuard>
  );
}
