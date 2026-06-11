"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/inventario/admin-guard";
import {
  SKUS, calcularStock, getMinimos, getOptimos, semaforoSku,
  colorSemaforo, dotSemaforo, consumoPromedioSemanal, diasCobertura,
  fetchTodosMovimientos,
  type Distribuidor, type Movimiento, type ConfigInventario, type StockPorSku,
} from "@/lib/inventario";
import { Loader2, Plus, ClipboardCheck, TrendingUp, Package, AlertTriangle, ExternalLink } from "lucide-react";

interface DistribuidorData {
  distribuidor: Distribuidor;
  stock: StockPorSku;
  minimos: StockPorSku;
  optimos: StockPorSku;
  totalStock: number;
  pctOcupacion: number;
  diasCob: number;
  skusEnRojo: number;
}

function InventarioDashboard() {
  const [data, setData] = useState<DistribuidorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: dists }, movs, { data: configs }] = await Promise.all([
        supabase.from("distribuidores").select("*").eq("activo", true).order("nombre"),
        fetchTodosMovimientos(supabase),
        supabase.from("inventario_config").select("*"),
      ]);

      const result: DistribuidorData[] = (dists ?? []).map((d: Distribuidor) => {
        const movsDist = (movs as Movimiento[]).filter(m => m.distribuidor_id === d.id);
        const config = ((configs ?? []) as ConfigInventario[]).find(c => c.distribuidor_id === d.id) ?? null;
        const stock = calcularStock(movsDist);
        const minimos = getMinimos(config);
        const optimos = getOptimos(config);
        const consumo = consumoPromedioSemanal(movsDist);

        const totalStock = SKUS.reduce((s, sku) => s + stock[sku.key], 0);
        const totalOptimo = SKUS.reduce((s, sku) => s + optimos[sku.key], 0);
        const consumoTotal = SKUS.reduce((s, sku) => s + consumo[sku.key], 0);
        const skusEnRojo = SKUS.filter(sku => semaforoSku(stock[sku.key], minimos[sku.key], optimos[sku.key]) === "rojo").length;

        return {
          distribuidor: d,
          stock, minimos, optimos,
          totalStock,
          pctOcupacion: totalOptimo > 0 ? Math.round((totalStock / totalOptimo) * 100) : 0,
          diasCob: diasCobertura(totalStock, consumoTotal),
          skusEnRojo,
        };
      });

      setData(result);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalUnidades = data.reduce((s, d) => s + d.totalStock, 0);
  const enRiesgo = data.filter(d => d.skusEnRojo > 0).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario en Consignación</h1>
          <p className="text-muted-foreground text-sm">Solo visible para administradores</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventario/movimiento/nuevo"
            className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold rounded-lg px-4 py-2.5 hover:opacity-80 transition-opacity">
            <Plus className="w-4 h-4" /> Movimiento
          </Link>
          <Link href="/inventario/corte"
            className="flex items-center gap-2 border border-border text-foreground text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-secondary transition-colors">
            <ClipboardCheck className="w-4 h-4" /> Corte semanal
          </Link>
          <Link href="/inventario/reposicion"
            className="flex items-center gap-2 border border-border text-foreground text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-secondary transition-colors">
            <TrendingUp className="w-4 h-4" /> Reposición
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total en consignación</p>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalUnidades}</p>
          <p className="text-xs text-muted-foreground">unidades</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Distribuidores</p>
          </div>
          <p className="text-3xl font-bold text-foreground">{data.length}</p>
          <p className="text-xs text-muted-foreground">activos</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${enRiesgo > 0 ? "border-red-500/30" : "border-border"}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${enRiesgo > 0 ? "text-red-500" : "text-muted-foreground"}`} />
            <p className="text-xs text-muted-foreground">En riesgo</p>
          </div>
          <p className={`text-3xl font-bold ${enRiesgo > 0 ? "text-red-500" : "text-foreground"}`}>{enRiesgo}</p>
          <p className="text-xs text-muted-foreground">con stock bajo mínimo</p>
        </div>
      </div>

      {/* Tarjetas por distribuidor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map(({ distribuidor: d, totalStock, pctOcupacion, diasCob, skusEnRojo, stock, minimos, optimos }) => (
          <Link key={d.id} href={`/inventario/${d.id}`}
            className="bg-card border border-border rounded-xl p-5 hover:border-foreground/30 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{d.nombre}</h3>
                <p className="text-xs text-muted-foreground">{d.zona ?? ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {skusEnRojo > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full border bg-red-500/15 text-red-500 border-red-500/30 font-medium">
                    {skusEnRojo} SKU{skusEnRojo > 1 ? "s" : ""} crítico{skusEnRojo > 1 ? "s" : ""}
                  </span>
                )}
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex gap-6 mb-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Stock</p>
                <p className="font-bold text-foreground">{totalStock} u.</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">vs Óptimo</p>
                <p className="font-bold text-foreground">{pctOcupacion}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cobertura</p>
                <p className="font-bold text-foreground">
                  {diasCob === Infinity ? "—" : `${Math.round(diasCob)} días`}
                </p>
              </div>
            </div>

            {/* Semáforos por SKU */}
            <div className="flex flex-wrap gap-1.5">
              {SKUS.map(sku => {
                const s = semaforoSku(stock[sku.key], minimos[sku.key], optimos[sku.key]);
                return (
                  <div key={sku.key} className="flex items-center gap-1 text-xs text-muted-foreground bg-background border border-border rounded-md px-1.5 py-0.5">
                    <span className={`w-2 h-2 rounded-full ${dotSemaforo(s)}`} />
                    {sku.label.split(" ")[0]} {stock[sku.key]}
                  </div>
                );
              })}
            </div>
          </Link>
        ))}
      </div>

      {/* Tabla resumen */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Stock por SKU</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Distribuidor</th>
                {SKUS.map(sku => (
                  <th key={sku.key} className="text-center text-xs text-muted-foreground font-medium px-2 py-3">
                    {sku.label}
                  </th>
                ))}
                <th className="text-center text-xs text-muted-foreground font-medium px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ distribuidor: d, stock, minimos, optimos, totalStock }) => (
                <tr key={d.id} className="border-b border-border/50">
                  <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">{d.nombre}</td>
                  {SKUS.map(sku => {
                    const s = semaforoSku(stock[sku.key], minimos[sku.key], optimos[sku.key]);
                    return (
                      <td key={sku.key} className="px-2 py-3 text-center">
                        <span className={`inline-block min-w-[32px] text-xs px-1.5 py-1 rounded border font-medium ${colorSemaforo(s)}`}>
                          {stock[sku.key]}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center font-bold text-foreground">{totalStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function InventarioPage() {
  return (
    <AdminGuard>
      <InventarioDashboard />
    </AdminGuard>
  );
}
