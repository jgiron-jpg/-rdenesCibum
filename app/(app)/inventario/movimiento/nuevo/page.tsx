"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/inventario/admin-guard";
import { SKUS, TIPOS_MOVIMIENTO, ESTADOS_MOVIMIENTO, type Distribuidor, type SkuKey } from "@/lib/inventario";
import { ArrowLeft, Loader2 } from "lucide-react";

function MovimientoForm() {
  const router = useRouter();
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [loading, setLoading] = useState(false);

  const [distribuidorId, setDistribuidorId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState("ENTREGA");
  const [referencia, setReferencia] = useState("");
  const [contrasenaPago, setContrasenaPago] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");
  const [notas, setNotas] = useState("");
  const [totalQ, setTotalQ] = useState("");
  const [cantidades, setCantidades] = useState<Record<SkuKey, number>>({
    especial_daniel: 0, honey_chipotle: 0, lemon_pepper: 0, teriyaki: 0,
    palitos_26g: 0, jerky_35g: 0, jerky_81g: 0,
  });

  useEffect(() => {
    createClient().from("distribuidores").select("*").eq("activo", true).order("nombre")
      .then(({ data }) => setDistribuidores(data ?? []));
  }, []);

  // VENTA_REPORTADA y DEVOLUCION son salidas → signo negativo automático
  const esSalida = tipo === "VENTA_REPORTADA" || tipo === "DEVOLUCION";

  const totalUnidades = SKUS.reduce((s, sku) => s + Math.abs(cantidades[sku.key]), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!distribuidorId) return;
    setLoading(true);

    const supabase = createClient();
    const payload: Record<string, unknown> = {
      distribuidor_id: distribuidorId,
      fecha,
      tipo,
      referencia: referencia || null,
      contrasena_pago: contrasenaPago || null,
      estado: estado || null,
      notas: notas || null,
      total_q: totalQ ? parseFloat(totalQ) : null,
    };

    // Aplicar signo según tipo
    for (const sku of SKUS) {
      const val = Math.abs(cantidades[sku.key]);
      payload[sku.key] = esSalida ? -val : (tipo === "AJUSTE" ? cantidades[sku.key] : val);
    }

    const { error } = await supabase.from("inventario_movimientos").insert(payload);

    if (!error) {
      router.push(`/inventario/${distribuidorId}`);
    } else {
      console.error(error);
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/inventario" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Registrar Movimiento</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Distribuidor *</label>
            <select value={distribuidorId} onChange={e => setDistribuidorId(e.target.value)} required className={inputClass}>
              <option value="">Seleccionar...</option>
              {distribuidores.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Fecha *</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Tipo *</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputClass}>
              {TIPOS_MOVIMIENTO.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Referencia (recibo)</label>
            <input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: Recibo #123" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Contraseña de pago</label>
            <input value={contrasenaPago} onChange={e => setContrasenaPago(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} className={inputClass}>
              {ESTADOS_MOVIMIENTO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {esSalida && (
          <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Las cantidades se registrarán como salidas (negativas) automáticamente.
          </p>
        )}
        {tipo === "AJUSTE" && (
          <p className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            En ajustes podés usar números negativos para restar.
          </p>
        )}
      </div>

      {/* Cantidades por SKU */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Cantidades por SKU</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SKUS.map(sku => (
            <div key={sku.key}>
              <label className="block text-xs text-muted-foreground mb-1">{sku.label}</label>
              <input
                type="number"
                value={cantidades[sku.key] || ""}
                onChange={e => setCantidades(prev => ({ ...prev, [sku.key]: parseInt(e.target.value) || 0 }))}
                min={tipo === "AJUSTE" ? undefined : 0}
                placeholder="0"
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">{totalUnidades} unidades</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Total Q:</label>
            <input
              type="number" step="0.01" value={totalQ}
              onChange={e => setTotalQ(e.target.value)}
              placeholder="0.00"
              className="w-28 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <label className="block text-xs text-muted-foreground mb-1">Notas</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
      </div>

      <div className="flex gap-3">
        <Link href="/inventario" className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </Link>
        <button type="submit" disabled={loading || !distribuidorId}
          className="flex items-center gap-2 bg-foreground hover:opacity-80 disabled:opacity-50 text-background font-semibold rounded-lg px-6 py-2.5 text-sm transition-opacity">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : "Registrar"}
        </button>
      </div>
    </form>
  );
}

export default function NuevoMovimientoPage() {
  return (
    <AdminGuard>
      <MovimientoForm />
    </AdminGuard>
  );
}
