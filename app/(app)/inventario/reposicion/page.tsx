"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/inventario/admin-guard";
import {
  SKUS, getMinimos, getOptimos, stockVacio,
  type Distribuidor, type ConfigInventario, type SkuKey, type StockPorSku,
} from "@/lib/inventario";
import { ArrowLeft, Loader2, Download, ChevronDown } from "lucide-react";
import { format } from "date-fns";

// Estado por SKU: conteo físico ingresado y cantidad aprobada
type CamposSku = { fisico: string; aprobado: string };
type FilasSku = Record<SkuKey, CamposSku>;

function filaVacia(): FilasSku {
  const obj = {} as FilasSku;
  for (const sku of SKUS) {
    obj[sku.key] = { fisico: "", aprobado: "" };
  }
  return obj;
}

function calcSugerido(fisico: number, optimo: number) {
  return Math.max(0, optimo - fisico);
}

function MargenBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground/50">—</span>;
  const cls =
    pct < 80
      ? "bg-red-500/15 text-red-500 border-red-500/30"
      : pct > 120
      ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
      : "bg-green-500/15 text-green-500 border-green-500/30";
  return (
    <span className={`text-xs px-2 py-1 rounded border font-bold ${cls}`}>
      {pct}%
    </span>
  );
}

function Reposicion() {
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [distribuidorId, setDistribuidorId] = useState("");
  const [optimos, setOptimos] = useState<StockPorSku>(stockVacio());
  const [minimos, setMinimos] = useState<StockPorSku>(stockVacio());
  const [filas, setFilas] = useState<FilasSku>(filaVacia());
  const [loadingDists, setLoadingDists] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Cargar distribuidores al montar
  useEffect(() => {
    createClient()
      .from("distribuidores")
      .select("*")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => {
        setDistribuidores(data ?? []);
        setLoadingDists(false);
      });
  }, []);

  // Cargar config cuando cambia el distribuidor
  useEffect(() => {
    if (!distribuidorId) return;
    setLoadingConfig(true);
    createClient()
      .from("inventario_config")
      .select("*")
      .eq("distribuidor_id", distribuidorId)
      .maybeSingle()
      .then(({ data }) => {
        const config = (data ?? null) as ConfigInventario | null;
        const opt = getOptimos(config);
        const min = getMinimos(config);
        setOptimos(opt);
        setMinimos(min);
        // Inicializar filas vacías y aprobado = sugerido cuando haya fisico
        setFilas(filaVacia());
        setLoadingConfig(false);
      });
  }, [distribuidorId]);

  function setFisico(skuKey: SkuKey, value: string) {
    setFilas((prev) => {
      const fisico = parseInt(value) || 0;
      const sug = calcSugerido(fisico, optimos[skuKey]);
      return {
        ...prev,
        [skuKey]: {
          fisico: value,
          // auto-completar aprobado con el sugerido si el usuario no lo tocó
          aprobado: prev[skuKey].aprobado === "" || prev[skuKey].aprobado === String(calcSugerido(parseInt(prev[skuKey].fisico) || 0, optimos[skuKey]))
            ? String(sug)
            : prev[skuKey].aprobado,
        },
      };
    });
  }

  function setAprobado(skuKey: SkuKey, value: string) {
    setFilas((prev) => ({
      ...prev,
      [skuKey]: { ...prev[skuKey], aprobado: value },
    }));
  }

  async function exportarExcel() {
    const dist = distribuidores.find((d) => d.id === distribuidorId);
    const { utils, writeFile } = await import("xlsx");
    const rows = SKUS.map((sku) => {
      const fisicoNum = parseInt(filas[sku.key].fisico) || 0;
      const aprobadoNum = parseInt(filas[sku.key].aprobado) || 0;
      const sugerido = calcSugerido(fisicoNum, optimos[sku.key]);
      const invFinal = fisicoNum + aprobadoNum;
      const margen = optimos[sku.key] > 0 ? Math.round((invFinal / optimos[sku.key]) * 100) : null;
      return {
        SKU: sku.label,
        Marca: sku.marca,
        "Inv. que queda": fisicoNum,
        Mínimo: minimos[sku.key],
        Óptimo: optimos[sku.key],
        Sugerido: sugerido,
        Aprobado: aprobadoNum,
        "Inv. Final": invFinal,
        "% vs Óptimo": margen !== null ? `${margen}%` : "—",
      };
    });
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Reposición");
    writeFile(
      wb,
      `cibum-reposicion-${dist?.nombre ?? "dist"}-${format(new Date(), "yyyy-MM-dd")}.xlsx`
    );
  }

  const distribuidorNombre = distribuidores.find((d) => d.id === distribuidorId)?.nombre ?? "";
  const hayFisico = SKUS.some((sku) => filas[sku.key].fisico !== "");

  const inputClass =
    "w-20 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  if (loadingDists) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inventario" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Control de Reposición</h1>
            <p className="text-muted-foreground text-sm">
              Ingresá el conteo físico · La app calcula qué entregar
            </p>
          </div>
        </div>
        {hayFisico && (
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 border border-border text-foreground rounded-lg px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        )}
      </div>

      {/* Selector de distribuidor */}
      <div className="bg-card border border-border rounded-xl p-5">
        <label className="block text-xs text-muted-foreground mb-2 font-medium">
          Distribuidor
        </label>
        <div className="relative max-w-sm">
          <select
            value={distribuidorId}
            onChange={(e) => setDistribuidorId(e.target.value)}
            className="w-full appearance-none bg-background border border-border rounded-lg px-4 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
          >
            <option value="">Seleccionar distribuidor...</option>
            {distribuidores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Tabla */}
      {distribuidorId && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{distribuidorNombre}</h3>
              <p className="text-xs text-muted-foreground">
                Ingresá el físico · Sugerido = Óptimo − Físico · Aprobado editable
              </p>
            </div>
            {loadingConfig && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { label: "SKU", align: "left" },
                    { label: "Inv. que queda", align: "center" },
                    { label: "Mínimo", align: "center" },
                    { label: "Óptimo", align: "center" },
                    { label: "Sugerido", align: "center" },
                    { label: "Aprobado", align: "center" },
                    { label: "Inv. Final", align: "center" },
                    { label: "% vs Óptimo", align: "center" },
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
                  const fisicoStr = filas[sku.key].fisico;
                  const aprobadoStr = filas[sku.key].aprobado;
                  const fisicoNum = parseInt(fisicoStr) || 0;
                  const aprobadoNum = parseInt(aprobadoStr) || 0;
                  const sugerido = fisicoStr !== "" ? calcSugerido(fisicoNum, optimos[sku.key]) : null;
                  const invFinal = fisicoStr !== "" ? fisicoNum + aprobadoNum : null;
                  const margen =
                    invFinal !== null && optimos[sku.key] > 0
                      ? Math.round((invFinal / optimos[sku.key]) * 100)
                      : null;

                  return (
                    <tr key={sku.key} className="border-b border-border/50">
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">
                        {sku.label}
                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                          {sku.marca}
                        </span>
                      </td>

                      {/* Inv. que queda — ingreso manual */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          value={fisicoStr}
                          placeholder="—"
                          onChange={(e) => setFisico(sku.key, e.target.value)}
                          className={inputClass}
                        />
                      </td>

                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {minimos[sku.key]}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {optimos[sku.key]}
                      </td>

                      {/* Sugerido — calculado */}
                      <td className="px-4 py-3 text-center">
                        {sugerido === null ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : sugerido > 0 ? (
                          <span className="font-bold text-foreground">+{sugerido}</span>
                        ) : (
                          <span className="text-muted-foreground/50">OK</span>
                        )}
                      </td>

                      {/* Aprobado — editable */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          value={aprobadoStr}
                          placeholder="—"
                          onChange={(e) => setAprobado(sku.key, e.target.value)}
                          className={inputClass}
                        />
                      </td>

                      {/* Inv. Final — calculado */}
                      <td className="px-4 py-3 text-center font-bold text-foreground">
                        {invFinal !== null ? invFinal : <span className="text-muted-foreground/40">—</span>}
                      </td>

                      {/* % vs Óptimo */}
                      <td className="px-4 py-3 text-center">
                        <MargenBadge pct={margen} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!distribuidorId && (
        <div className="text-center text-muted-foreground text-sm py-12">
          Seleccioná un distribuidor para comenzar el control de reposición.
        </div>
      )}
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
