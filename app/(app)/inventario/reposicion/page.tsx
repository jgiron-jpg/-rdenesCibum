"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/inventario/admin-guard";
import {
  SKUS, getMinimos, getOptimos, stockVacio,
  type Distribuidor, type ConfigInventario, type SkuKey, type StockPorSku,
} from "@/lib/inventario";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { format } from "date-fns";

interface DistribuidorFila {
  distribuidor: Distribuidor;
  fechaCorte: string | null;
  stockActual: StockPorSku;
  minimos: StockPorSku;
  optimos: StockPorSku;
}

// Aprobados: distribuidorId -> skuKey -> cantidad
type Aprobados = Record<string, Record<string, string>>;

function calcSugerido(stock: number, optimo: number) {
  return Math.max(0, optimo - stock);
}

function calcInvFinal(stock: number, aprobado: number) {
  return stock + aprobado;
}

function calcMargen(invFinal: number, optimo: number): number | null {
  if (optimo <= 0) return null;
  return Math.round((invFinal / optimo) * 100);
}

function MargenBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground">—</span>;
  const bajo = pct < 80;
  const sobre = pct > 120;
  const cls = bajo
    ? "bg-red-500/15 text-red-500 border-red-500/30"
    : sobre
    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
    : "bg-green-500/15 text-green-500 border-green-500/30";
  return (
    <span className={`text-xs px-2 py-1 rounded border font-bold ${cls}`}>
      {pct}%
    </span>
  );
}

function Reposicion() {
  const [data, setData] = useState<DistribuidorFila[]>([]);
  const [aprobados, setAprobados] = useState<Aprobados>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: dists }, { data: cortes }, { data: configs }] = await Promise.all([
        supabase.from("distribuidores").select("*").eq("activo", true).order("nombre"),
        supabase.from("inventario_cortes").select("*").order("fecha_corte", { ascending: false }),
        supabase.from("inventario_config").select("*"),
      ]);

      const result: DistribuidorFila[] = [];
      const aprobadosInit: Aprobados = {};

      for (const d of (dists ?? []) as Distribuidor[]) {
        const ultimoCorte = ((cortes ?? []) as Record<string, unknown>[]).find(
          (c) => c.distribuidor_id === d.id
        );
        const config = ((configs ?? []) as ConfigInventario[]).find(
          (c) => c.distribuidor_id === d.id
        ) ?? null;

        const stockActual = stockVacio();
        if (ultimoCorte) {
          for (const sku of SKUS) {
            const val = ultimoCorte[`fisico_${sku.key}`];
            stockActual[sku.key] = typeof val === "number" ? val : 0;
          }
        }

        const minimos = getMinimos(config);
        const optimos = getOptimos(config);

        // Inicializar aprobados con el sugerido
        aprobadosInit[d.id] = {};
        for (const sku of SKUS) {
          const sug = calcSugerido(stockActual[sku.key], optimos[sku.key]);
          aprobadosInit[d.id][sku.key] = String(sug);
        }

        result.push({
          distribuidor: d,
          fechaCorte: ultimoCorte ? String(ultimoCorte.fecha_corte) : null,
          stockActual,
          minimos,
          optimos,
        });
      }

      setData(result);
      setAprobados(aprobadosInit);
      setLoading(false);
    }
    fetchData();
  }, []);

  function setAprobado(distribuidorId: string, skuKey: string, value: string) {
    setAprobados((prev) => ({
      ...prev,
      [distribuidorId]: { ...prev[distribuidorId], [skuKey]: value },
    }));
  }

  async function exportarExcel() {
    const { utils, writeFile } = await import("xlsx");
    const rows: Record<string, unknown>[] = [];
    for (const { distribuidor: d, stockActual, optimos, fechaCorte } of data) {
      for (const sku of SKUS) {
        const stock = stockActual[sku.key];
        const optimo = optimos[sku.key];
        const aprobado = parseInt(aprobados[d.id]?.[sku.key] ?? "0") || 0;
        const sugerido = calcSugerido(stock, optimo);
        const invFinal = calcInvFinal(stock, aprobado);
        const margen = calcMargen(invFinal, optimo);
        rows.push({
          Distribuidor: d.nombre,
          "Último corte": fechaCorte ?? "—",
          SKU: sku.label,
          "Inv. que queda": stock,
          Óptimo: optimo,
          Sugerido: sugerido,
          Aprobado: aprobado,
          "Inv. Final": invFinal,
          "% vs Óptimo": margen !== null ? `${margen}%` : "—",
        });
      }
    }
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Reposición");
    writeFile(wb, `cibum-reposicion-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inventario" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Control de Reposición</h1>
            <p className="text-muted-foreground text-sm">
              Stock basado en último corte físico · Aprobado editable por supervisor
            </p>
          </div>
        </div>
        <button
          onClick={exportarExcel}
          className="flex items-center gap-2 border border-border text-foreground rounded-lg px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      {data.map(({ distribuidor: d, fechaCorte, stockActual, optimos }) => (
        <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{d.nombre}</h3>
              <p className="text-xs text-muted-foreground">
                {fechaCorte
                  ? `Último corte: ${format(new Date(fechaCorte), "dd/MM/yyyy")}`
                  : "Sin corte registrado"}
              </p>
            </div>
            {!fechaCorte && (
              <span className="text-xs px-2 py-1 rounded border bg-amber-500/15 text-amber-500 border-amber-500/30 font-medium">
                Sin datos de corte
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "SKU",
                    "Inv. que queda",
                    "Óptimo",
                    "Sugerido",
                    "Aprobado",
                    "Inv. Final",
                    "% vs Óptimo",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs text-muted-foreground font-medium px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SKUS.map((sku) => {
                  const stock = stockActual[sku.key];
                  const optimo = optimos[sku.key];
                  const sugerido = calcSugerido(stock, optimo);
                  const aprobadoStr = aprobados[d.id]?.[sku.key] ?? "0";
                  const aprobadoNum = parseInt(aprobadoStr) || 0;
                  const invFinal = calcInvFinal(stock, aprobadoNum);
                  const margen = calcMargen(invFinal, optimo);

                  return (
                    <tr key={sku.key} className="border-b border-border/50">
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">
                        {sku.label}
                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                          {sku.marca}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground font-bold">{stock}</td>
                      <td className="px-4 py-3 text-muted-foreground">{optimo}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sugerido > 0 ? (
                          <span className="font-medium text-foreground">+{sugerido}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={aprobadoStr}
                          onChange={(e) => setAprobado(d.id, sku.key as SkuKey, e.target.value)}
                          className="w-20 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">{invFinal}</td>
                      <td className="px-4 py-3">
                        <MargenBadge pct={margen} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReposicionPage() {
  return (
    <AdminGuard>
      <Reposicion />
    </AdminGuard>
  );
}
