"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SKUS, PUNTOS_VENTA } from "@/lib/inventario";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

export default function NuevoMovimiento() {
  const router = useRouter();
  const [fecha, setFecha]        = useState(new Date().toISOString().slice(0, 10));
  const [puntoVenta, setPunto]   = useState("");
  const [puntoCustom, setCustom] = useState("");
  const [cantidades, setCant]    = useState<Record<string, string>>(
    Object.fromEntries(SKUS.map((s) => [s.key, ""]))
  );
  const [loading, setLoading]    = useState(false);
  const [error, setError]        = useState("");

  function setCantidad(key: string, val: string) {
    setCant((prev) => ({ ...prev, [key]: val }));
  }

  const totalUnidades = SKUS.reduce((s, sku) => s + (parseInt(cantidades[sku.key]) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!puntoVenta) {
      setError("Seleccioná el punto de venta.");
      return;
    }
    setError("");
    setLoading(true);

    const puntoFinal = puntoVenta === "Otro" ? puntoCustom : puntoVenta;

    const payload: Record<string, unknown> = {
      fecha,
      tipo: "CAMBIO",
      referencia: puntoFinal || null,
      total_unidades: totalUnidades,
    };

    for (const sku of SKUS) {
      payload[sku.key] = parseInt(cantidades[sku.key]) || 0;
    }

    const { error: err } = await createClient().from("ericka_movimientos").insert(payload);
    if (!err) {
      // Sync a Control Ericka sheet (fire and forget)
      fetch("/api/sheets/sync-movimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movimiento: payload }),
      }).catch(() => {});
      router.push("/inventario");
    } else {
      console.error(err);
      setError("Error al guardar. Intentá de nuevo.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/inventario" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Registrar Cambio</h1>
          <p className="text-muted-foreground text-sm">Cambios de producto vencido en tienda</p>
        </div>
      </div>

      {/* Tipo — solo cambio */}
      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 text-amber-400">
        <RefreshCw className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">Cambio</p>
          <p className="text-xs opacity-70">Reemplazo de producto vencido. No afecta el inventario neto.</p>
        </div>
      </div>

      {/* Datos generales */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Fecha *</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={inputClass} />
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground mb-1">Punto de venta *</label>
          <select
            value={puntoVenta}
            onChange={(e) => setPunto(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Seleccionar punto de venta...</option>
            {PUNTOS_VENTA.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {puntoVenta === "Otro" && (
            <input
              type="text"
              value={puntoCustom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Nombre del punto de venta"
              required
              className={inputClass}
            />
          )}
        </div>
      </div>

      {/* Cantidades por SKU */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Cantidades por SKU</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Unidades reemplazadas (vencidas ↔ nuevas)</p>
          </div>
          {totalUnidades > 0 && (
            <span className="text-xs font-bold text-foreground bg-secondary px-3 py-1 rounded-full">
              {totalUnidades} u. total
            </span>
          )}
        </div>
        <div className="divide-y divide-border/50">
          {SKUS.map((sku) => (
            <div key={sku.key} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm text-foreground font-medium">{sku.label}</p>
                <p className="text-xs text-muted-foreground">{sku.marca}</p>
              </div>
              <input
                type="number"
                min={0}
                value={cantidades[sku.key]}
                onChange={(e) => setCantidad(sku.key, e.target.value)}
                placeholder="0"
                className="w-24 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
              />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        <Link
          href="/inventario"
          className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading || totalUnidades === 0}
          className="flex items-center gap-2 bg-foreground hover:opacity-80 disabled:opacity-50 text-background font-semibold rounded-lg px-6 py-2.5 text-sm transition-opacity"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            : "Guardar cambio"
          }
        </button>
      </div>
    </form>
  );
}
