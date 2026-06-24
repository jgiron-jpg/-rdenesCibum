"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SKUS, PUNTOS_VENTA } from "@/lib/inventario";
import { ArrowLeft, Loader2, Package, Truck, RefreshCw } from "lucide-react";

type Tipo = "RECIBO" | "DESPACHO" | "CAMBIO";

const TIPOS: { key: Tipo; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  {
    key: "RECIBO",
    label: "Recibo",
    desc: "Producto recibido de producción",
    icon: Package,
    color: "border-green-500/50 bg-green-500/10 text-green-500",
  },
  {
    key: "DESPACHO",
    label: "Despacho",
    desc: "Producto enviado a un punto de venta",
    icon: Truck,
    color: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  },
  {
    key: "CAMBIO",
    label: "Cambio",
    desc: "Reemplazo de producto vencido en tienda",
    icon: RefreshCw,
    color: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  },
];

export default function NuevoMovimiento() {
  const router = useRouter();
  const [tipo, setTipo]           = useState<Tipo>("DESPACHO");
  const [fecha, setFecha]         = useState(new Date().toISOString().slice(0, 10));
  const [referencia, setRef]      = useState("");
  const [puntoVenta, setPunto]    = useState("");
  const [puntoCustom, setCustom]  = useState("");
  const [notas, setNotas]         = useState("");
  const [cantidades, setCant]     = useState<Record<string, string>>(
    Object.fromEntries(SKUS.map((s) => [s.key, ""]))
  );
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  function setCantidad(key: string, val: string) {
    setCant((prev) => ({ ...prev, [key]: val }));
  }

  const totalUnidades = SKUS.reduce((s, sku) => s + (parseInt(cantidades[sku.key]) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((tipo === "DESPACHO" || tipo === "CAMBIO") && !puntoVenta) {
      setError("Seleccioná el punto de venta.");
      return;
    }
    setError("");
    setLoading(true);

    const puntoFinal = puntoVenta === "Otro" ? puntoCustom : puntoVenta;
    const refFinal   = referencia || puntoFinal || null;

    const payload: Record<string, unknown> = {
      fecha,
      tipo,
      referencia: refFinal,
      notas: notas || null,
    };

    let total = 0;
    for (const sku of SKUS) {
      const raw = parseInt(cantidades[sku.key]) || 0;
      // RECIBO: positivo | DESPACHO: negativo | CAMBIO: se guarda positivo solo para registro
      const val = tipo === "RECIBO" ? raw : tipo === "DESPACHO" ? -raw : raw;
      payload[sku.key] = val;
      total += val;
    }
    payload.total_unidades = total;

    const { error: err } = await createClient().from("ericka_movimientos").insert(payload);
    if (!err) {
      router.push("/inventario");
    } else {
      console.error(err);
      setError("Error al guardar. Intentá de nuevo.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  const necesitaPunto = tipo === "DESPACHO" || tipo === "CAMBIO";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/inventario" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Nuevo Movimiento</h1>
          <p className="text-muted-foreground text-sm">Seleccioná el tipo y completá los datos</p>
        </div>
      </div>

      {/* Selector de tipo */}
      <div className="grid grid-cols-3 gap-3">
        {TIPOS.map(({ key, label, desc, icon: Icon, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTipo(key); setPunto(""); setCustom(""); }}
            className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${
              tipo === key ? color : "border-border bg-card text-muted-foreground hover:border-foreground/20"
            }`}
          >
            <Icon className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs opacity-70 leading-tight">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Datos generales */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Fecha *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Referencia</label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setRef(e.target.value)}
              placeholder={tipo === "RECIBO" ? "Ej: Recibo 24/05/2026" : "Opcional"}
              className={inputClass}
            />
          </div>
        </div>

        {/* Punto de venta — solo para DESPACHO y CAMBIO */}
        {necesitaPunto && (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground mb-1">Punto de venta *</label>
            <select
              value={puntoVenta}
              onChange={(e) => setPunto(e.target.value)}
              required={necesitaPunto}
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
        )}
      </div>

      {/* Cantidades por SKU */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Cantidades por SKU</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tipo === "RECIBO"
                ? "Unidades recibidas de producción"
                : tipo === "DESPACHO"
                ? "Unidades despachadas al punto de venta"
                : "Unidades reemplazadas (vencidas ↔ nuevas)"}
            </p>
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

      {/* Notas */}
      <div className="bg-card border border-border rounded-xl p-5">
        <label className="block text-xs text-muted-foreground mb-1">Notas</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Observaciones opcionales..."
          className={`${inputClass} resize-none`}
        />
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
            : `Guardar ${tipo === "RECIBO" ? "recibo" : tipo === "DESPACHO" ? "despacho" : "cambio"}`
          }
        </button>
      </div>
    </form>
  );
}
