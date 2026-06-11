"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/inventario/admin-guard";
import {
  SKUS, calcularStock, getOptimos, consumoPromedioSemanal, diasCobertura,
  nivelRiesgo, colorRiesgo,
  type Distribuidor, type Movimiento, type ConfigInventario, type Riesgo,
} from "@/lib/inventario";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { format } from "date-fns";

interface FilaReposicion {
  distribuidor: string;
  sku: string;
  stock: number;
  optimo: number;
  consumoSemanal: number;
  diasCob: number;
  sugerido: number;
  riesgo: Riesgo;
}

function Reposicion() {
  const [filas, setFilas] = useState<FilaReposicion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: dists }, { data: movs }, { data: configs }] = await Promise.all([
        supabase.from("distribuidores").select("*").eq("activo", true).order("nombre"),
        supabase.from("inventario_movimientos").select("*").limit(2000),
        supabase.from("inventario_config").select("*"),
      ]);

      const result: FilaReposicion[] = [];
      for (const d of (dists ?? []) as Distribuidor[]) {
        const movsDist = ((movs ?? []) as Movimiento[]).filter(m => m.distribuidor_id === d.id);
        const config = ((configs ?? []) as ConfigInventario[]).find(c => c.distribuidor_id === d.id) ?? null;
        const stock = calcularStock(movsDist);
        const optimos = getOptimos(config);
        const consumo = consumoPromedioSemanal(movsDist);

        for (const sku of SKUS) {
          const st = stock[sku.key];
          const sugerido = Math.max(0, optimos[sku.key] - st);
          const dias = diasCobertura(st, consumo[sku.key]);
          if (sugerido === 0) continue; // solo mostrar lo que necesita reposición
          result.push({
            distribuidor: d.nombre,
            sku: sku.label,
            stock: st,
            optimo: optimos[sku.key],
            consumoSemanal: consumo[sku.key],
            diasCob: dias,
            sugerido,
            riesgo: nivelRiesgo(dias),
          });
        }
      }

      // Ordenar por urgencia: ALTO primero, luego por días de cobertura
      const orden: Record<Riesgo, number> = { ALTO: 0, MEDIO: 1, BAJO: 2 };
      result.sort((a, b) => orden[a.riesgo] - orden[b.riesgo] || a.diasCob - b.diasCob);

      setFilas(result);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function exportarExcel() {
    const { utils, writeFile } = await import("xlsx");
    const rows = filas.map(f => ({
      Distribuidor: f.distribuidor,
      SKU: f.sku,
      "Stock actual": f.stock,
      "Stock óptimo": f.optimo,
      "Consumo semanal": Number(f.consumoSemanal.toFixed(1)),
      "Días cobertura": f.diasCob === Infinity ? "—" : Math.round(f.diasCob),
      "Cantidad sugerida": f.sugerido,
      Riesgo: f.riesgo,
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Reposición");
    writeFile(wb, `cibum-reposicion-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inventario" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Reposición Sugerida</h1>
            <p className="text-muted-foreground text-sm">Ordenado por urgencia — metodología min/max</p>
          </div>
        </div>
        <button onClick={exportarExcel} disabled={filas.length === 0}
          className="flex items-center gap-2 border border-border text-foreground rounded-lg px-4 py-2.5 text-sm hover:bg-secondary disabled:opacity-50 transition-colors">
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filas.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">
            Todo el inventario está en niveles óptimos 🎉
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Distribuidor", "SKU", "Stock", "Óptimo", "Consumo/sem", "Cobertura", "Enviar", "Riesgo"].map(h => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{f.distribuidor}</td>
                    <td className="px-4 py-3 text-foreground">{f.sku}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.stock}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.optimo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.consumoSemanal.toFixed(1)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.diasCob === Infinity ? "—" : `${Math.round(f.diasCob)} días`}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">+{f.sugerido}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${colorRiesgo(f.riesgo)}`}>
                        {f.riesgo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
