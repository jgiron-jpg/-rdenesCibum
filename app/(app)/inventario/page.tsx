"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  SKUS, calcularStock, getOptimos, fetchMovimientos, margenColor,
  type Movimiento, type ConfigEricka, type StockPorSku,
} from "@/lib/inventario";
import { Loader2, Plus, Download } from "lucide-react";
import { format } from "date-fns";

// Aprobado por producción: editable por SKU
type Aprobados = Record<string, string>;

function aprobadosVacios(): Aprobados {
  const obj: Aprobados = {};
  for (const sku of SKUS) obj[sku.key] = "0";
  return obj;
}

function InventarioEricka() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [optimos, setOptimos] = useState<StockPorSku | null>(null);
  const [aprobados, setAprobados] = useState<Aprobados>(aprobadosVacios());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [movs, { data: cfg }] = await Promise.all([
        fetchMovimientos(supabase),
        supabase.from("ericka_config").select("*").maybeSingle(),
      ]);
      setMovimientos(movs);
      setOptimos(getOptimos((cfg as ConfigEricka | null)));
      setLoading(false);
    }
    fetchData();
  }, []);

  function setAprobado(skuKey: string, val: string) {
    setAprobados((prev) => ({ ...prev, [skuKey]: val }));
  }

  async function exportarExcel() {
    if (!optimos) return;
    const stock = calcularStock(movimientos);
    const { utils, writeFile } = await import("xlsx");
    const rows = SKUS.map((sku) => {
      const actual   = stock[sku.key];
      const optimo   = optimos[sku.key];
      const aprobado = parseInt(aprobados[sku.key]) || 0;
      const final    = actual + aprobado;
      const margen   = optimo > 0 ? Math.round((final / optimo) * 100) : null;
      return {
        SKU:                  sku.label,
        Marca:                sku.marca,
        "Inv. actual":        actual,
        Óptimo:               optimo,
        "Prod. aprobado":     aprobado,
        "Inv. final":         final,
        "% vs Óptimo":        margen !== null ? `${margen}%` : "—",
      };
    });
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Control Ericka");
    writeFile(wb, `control-ericka-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  if (loading || !optimos) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stock = calcularStock(movimientos);

  // KPIs
  const totalActual  = SKUS.reduce((s, sku) => s + stock[sku.key], 0);
  const totalOptimo  = SKUS.reduce((s, sku) => s + optimos[sku.key], 0);
  const totalAprobado = SKUS.reduce((s, sku) => s + (parseInt(aprobados[sku.key]) || 0), 0);
  const totalFinal   = totalActual + totalAprobado;
  const margenGlobal = totalOptimo > 0 ? Math.round((totalFinal / totalOptimo) * 100) : 0;

  // Últimos 10 movimientos
  const recientes = movimientos.slice(0, 10);

  const inputClass =
    "w-24 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control Ericka</h1>
          <p className="text-muted-foreground text-sm">Inventario en consignación</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inventario/movimiento"
            className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold rounded-lg px-4 py-2.5 hover:opacity-80 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Movimiento
          </Link>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 border border-border text-foreground text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Inv. actual",   value: totalActual,   sub: "unidades" },
          { label: "Óptimo total",  value: totalOptimo,   sub: "unidades" },
          { label: "Prod. aprobado", value: totalAprobado, sub: "a entregar" },
          { label: "Margen global", value: `${margenGlobal}%`, sub: "vs óptimo" },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabla de control — 5 columnas */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Tabla de control de reposición</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingresá el producto aprobado por producción para calcular el inventario final
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: "SKU",                align: "left"   },
                  { label: "Inv. actual",        align: "center" },
                  { label: "Óptimo",             align: "center" },
                  { label: "Prod. aprobado",     align: "center" },
                  { label: "Inv. final",         align: "center" },
                  { label: "% vs Óptimo",        align: "center" },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`text-${h.align} text-xs text-muted-foreground font-medium px-4 py-3 whitespace-nowrap`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKUS.map((sku) => {
                const actual   = stock[sku.key];
                const optimo   = optimos[sku.key];
                const aprobado = parseInt(aprobados[sku.key]) || 0;
                const final    = actual + aprobado;
                const pct      = optimo > 0 ? Math.round((final / optimo) * 100) : null;

                return (
                  <tr key={sku.key} className="border-b border-border/50">
                    <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">
                      {sku.label}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {sku.marca}
                      </span>
                    </td>

                    {/* 1. Inv. actual */}
                    <td className="px-4 py-3 text-center font-bold text-foreground">
                      {actual}
                    </td>

                    {/* 2. Óptimo */}
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {optimo}
                    </td>

                    {/* 3. Prod. aprobado — editable */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        value={aprobados[sku.key]}
                        onChange={(e) => setAprobado(sku.key, e.target.value)}
                        className={inputClass}
                      />
                    </td>

                    {/* 4. Inv. final */}
                    <td className="px-4 py-3 text-center font-bold text-foreground">
                      {final}
                    </td>

                    {/* 5. Margen % */}
                    <td className="px-4 py-3 text-center">
                      {pct !== null ? (
                        <span className={`text-xs px-2 py-1 rounded border font-bold ${margenColor(pct)}`}>
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Fila de totales */}
              <tr className="bg-secondary/30">
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">TOTAL</td>
                <td className="px-4 py-3 text-center font-bold text-foreground">{totalActual}</td>
                <td className="px-4 py-3 text-center font-bold text-foreground">{totalOptimo}</td>
                <td className="px-4 py-3 text-center font-bold text-foreground">{totalAprobado}</td>
                <td className="px-4 py-3 text-center font-bold text-foreground">{totalFinal}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded border font-bold ${margenColor(margenGlobal)}`}>
                    {margenGlobal}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Últimos movimientos */}
      {recientes.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Últimos movimientos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Fecha", "Tipo", "Referencia", ...SKUS.map(s => s.label.split(" ")[0]), "Total"].map((h) => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recientes.map((m) => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(m.fecha), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        m.tipo === "ENTREGA"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : m.tipo === "VENTA"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-secondary text-muted-foreground border-border"
                      }`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{m.referencia ?? "—"}</td>
                    {SKUS.map((sku) => {
                      const val = (m[sku.key as keyof Movimiento] as number) ?? 0;
                      return (
                        <td key={sku.key} className={`px-4 py-2.5 text-xs font-medium text-center ${
                          val > 0 ? "text-green-500" : val < 0 ? "text-red-400" : "text-muted-foreground/30"
                        }`}>
                          {val !== 0 ? (val > 0 ? `+${val}` : val) : "·"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-xs font-bold text-foreground text-center">
                      {m.total_unidades}
                    </td>
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

export default function InventarioPage() {
  return <InventarioEricka />;
}
