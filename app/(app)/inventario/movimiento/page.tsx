"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SKUS } from "@/lib/inventario";
import { ArrowLeft, Loader2 } from "lucide-react";

const TIPOS = ["ENTREGA", "VENTA", "AJUSTE", "DEVOLUCION"] as const;

export default function NuevoMovimiento() {
  const router = useRouter();
  const [fecha, setFecha]       = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo]         = useState<string>("ENTREGA");
  const [referencia, setRef]    = useState("");
  const [notas, setNotas]       = useState("");
  const [cantidades, setCant]   = useState<Record<string, string>>(
    Object.fromEntries(SKUS.map((s) => [s.key, ""]))
  );
  const [loading, setLoading]   = useState(false);

  function setCantidad(key: string, val: string) {
    setCant((prev) => ({ ...prev, [key]: val }));
  }

  // Ventas y devoluciones se guardan como negativos
  function signo(val: number) {
    return tipo === "ENTREGA" ? Math.abs(val) : -Math.abs(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const payload: Record<string, unknown> = {
      fecha,
      tipo,
      referencia: referencia || null,
      notas: notas || null,
    };
    let totalUnidades = 0;
    for (const sku of SKUS) {
      const raw = parseInt(cantidades[sku.key]) || 0;
      const val = raw === 0 ? 0 : signo(raw);
      payload[sku.key] = val;
      totalUnidades += val;
    }
    payload.total_unidades = totalUnidades;

    const { error } = await supabase.from("ericka_movimientos").insert(payload);
    if (!error) {
      router.push("/inventario");
    } else {
      console.error(error);
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/inventario" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Nuevo Movimiento</h1>
          <p className="text-muted-foreground text-sm">Registrar entrega, venta, ajuste o devolución</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Tipo *</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className={inputClass}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Fecha *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Referencia</label>
          <input
            type="text"
            value={referencia}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Ej: Recibo 24/05/2026, La Torre Cayala..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Cantidades por SKU</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingresá números positivos — el signo se aplica automáticamente según el tipo
          </p>
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

      <div className="bg-card border border-border rounded-xl p-5">
        <label className="block text-xs text-muted-foreground mb-1">Notas</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex gap-3">
        <Link href="/inventario" className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-foreground hover:opacity-80 disabled:opacity-50 text-background font-semibold rounded-lg px-6 py-2.5 text-sm transition-opacity"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar movimiento"}
        </button>
      </div>
    </form>
  );
}
