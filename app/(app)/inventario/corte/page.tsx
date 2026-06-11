"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/inventario/admin-guard";
import { SKUS, calcularStock, stockVacio, fetchTodosMovimientos, type Distribuidor, type SkuKey, type StockPorSku } from "@/lib/inventario";
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

function CorteForm() {
  const router = useRouter();
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [distribuidorId, setDistribuidorId] = useState("");
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().slice(0, 10));
  const [teorico, setTeorico] = useState<StockPorSku>(stockVacio());
  const [fisico, setFisico] = useState<Record<SkuKey, string>>({
    especial_daniel: "", honey_chipotle: "", lemon_pepper: "", teriyaki: "",
    palitos_26g: "", jerky_35g: "", jerky_81g: "",
  });
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    createClient().from("distribuidores").select("*").eq("activo", true).order("nombre")
      .then(({ data }) => setDistribuidores(data ?? []));
  }, []);

  // Calcular teórico al elegir distribuidor
  useEffect(() => {
    if (!distribuidorId) return;
    setCalculando(true);
    fetchTodosMovimientos(createClient(), { distribuidorId, hastaFecha: fechaCorte })
      .then((movs) => {
        setTeorico(calcularStock(movs));
        setCalculando(false);
      });
  }, [distribuidorId, fechaCorte]);

  const diferencias = SKUS.map(sku => {
    const f = fisico[sku.key] === "" ? null : parseInt(fisico[sku.key]);
    return {
      sku,
      teorico: teorico[sku.key],
      fisico: f,
      dif: f === null ? null : teorico[sku.key] - f,
    };
  });

  const hayDiferenciasGrandes = diferencias.some(d => d.dif !== null && Math.abs(d.dif) > 5);
  const todosLlenos = diferencias.every(d => d.fisico !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!distribuidorId) return;
    setLoading(true);

    const payload: Record<string, unknown> = {
      distribuidor_id: distribuidorId,
      fecha_corte: fechaCorte,
      conciliado: true,
      notas: notas || null,
    };
    for (const sku of SKUS) {
      payload[`teorico_${sku.key}`] = teorico[sku.key];
      payload[`fisico_${sku.key}`] = fisico[sku.key] === "" ? null : parseInt(fisico[sku.key]);
    }

    const { error } = await createClient().from("inventario_cortes").insert(payload);
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
        <div>
          <h1 className="text-xl font-bold text-foreground">Corte Semanal</h1>
          <p className="text-muted-foreground text-sm">Conciliación teórico vs físico</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Distribuidor *</label>
          <select value={distribuidorId} onChange={e => setDistribuidorId(e.target.value)} required className={inputClass}>
            <option value="">Seleccionar...</option>
            {distribuidores.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Fecha de corte *</label>
          <input type="date" value={fechaCorte} onChange={e => setFechaCorte(e.target.value)} required className={inputClass} />
        </div>
      </div>

      {distribuidorId && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Conciliación</h3>
            {calculando && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">SKU</th>
                <th className="text-center text-xs text-muted-foreground font-medium px-3 py-3">Teórico</th>
                <th className="text-center text-xs text-muted-foreground font-medium px-3 py-3">Físico reportado</th>
                <th className="text-center text-xs text-muted-foreground font-medium px-3 py-3">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {diferencias.map(({ sku, teorico: t, dif }) => (
                <tr key={sku.key} className="border-b border-border/50">
                  <td className="px-4 py-3 text-foreground">{sku.label}</td>
                  <td className="px-3 py-3 text-center font-bold text-foreground">{t}</td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={fisico[sku.key]}
                      onChange={e => setFisico(prev => ({ ...prev, [sku.key]: e.target.value }))}
                      placeholder="—"
                      className="w-20 mx-auto block bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {dif === null ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded border font-bold ${
                        dif === 0 ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : Math.abs(dif) > 5 ? "bg-red-500/15 text-red-500 border-red-500/30"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {dif > 0 ? `+${dif}` : dif}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hayDiferenciasGrandes && (
            <div className="flex items-center gap-2 mx-5 my-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-500">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Hay diferencias mayores a 5 unidades — revisar conciliación con el distribuidor.
            </div>
          )}
          {todosLlenos && !hayDiferenciasGrandes && (
            <div className="flex items-center gap-2 mx-5 my-4 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm text-green-500">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Conciliación dentro del margen aceptable.
            </div>
          )}

          <div className="px-5 pb-5">
            <label className="block text-xs text-muted-foreground mb-1">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/inventario" className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </Link>
        <button type="submit" disabled={loading || !distribuidorId}
          className="flex items-center gap-2 bg-foreground hover:opacity-80 disabled:opacity-50 text-background font-semibold rounded-lg px-6 py-2.5 text-sm transition-opacity">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : "Guardar corte conciliado"}
        </button>
      </div>
    </form>
  );
}

export default function CortePage() {
  return (
    <AdminGuard>
      <CorteForm />
    </AdminGuard>
  );
}
