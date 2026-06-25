"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  SKUS, calcularStock, getOptimos, fetchMovimientos, margenColor,
  type Movimiento, type ConfigEricka, type StockPorSku,
} from "@/lib/inventario";
import { Loader2, Plus, ChevronDown, ChevronUp, CheckCircle2, Trash2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Aprobados = Record<string, string>;

function aprobadosVacios(): Aprobados {
  const obj: Aprobados = {};
  for (const sku of SKUS) obj[sku.key] = "0";
  return obj;
}

function InventarioEricka() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [optimos, setOptimos]         = useState<StockPorSku | null>(null);
  const [aprobados, setAprobados]       = useState<Aprobados>(aprobadosVacios());
  const [loading, setLoading]           = useState(true);
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [guardando, setGuardando]       = useState(false);
  const [exito, setExito]               = useState(false);
  const [borrando, setBorrando]         = useState<string | null>(null);
  const [editandoOptimos, setEditandoOptimos] = useState(false);
  const [optimosEdit, setOptimosEdit]   = useState<Record<string, string>>({});
  const [guardandoOptimos, setGuardandoOptimos] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [movs, { data: cfg }] = await Promise.all([
        fetchMovimientos(supabase),
        supabase.from("ericka_config").select("*").maybeSingle(),
      ]);
      setMovimientos(movs);
      setOptimos(getOptimos(cfg as ConfigEricka | null));
      setLoading(false);
    }
    fetchData();
  }, []);

  function setAprobado(skuKey: string, val: string) {
    setAprobados((prev) => ({ ...prev, [skuKey]: val }));
  }

  async function registrarRecibo() {
    const hayValores = SKUS.some((sku) => (parseInt(aprobados[sku.key]) || 0) > 0);
    if (!hayValores) return;
    setGuardando(true);

    const supabase = createClient();
    const payload: Record<string, unknown> = {
      fecha: new Date().toISOString().slice(0, 10),
      tipo: "RECIBO",
      referencia: `Recibo ${new Date().toLocaleDateString("es-GT")}`,
      notas: "Registrado desde tabla de control",
    };
    let total = 0;
    for (const sku of SKUS) {
      const val = parseInt(aprobados[sku.key]) || 0;
      payload[sku.key] = val;
      total += val;
    }
    payload.total_unidades = total;

    const { error } = await supabase.from("ericka_movimientos").insert(payload);
    if (!error) {
      // Recargar movimientos y resetear aprobados
      const movs = await fetchMovimientos(supabase);
      setMovimientos(movs);
      setAprobados(aprobadosVacios());
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    }
    setGuardando(false);
  }

  async function borrarMovimiento(id: string) {
    if (!confirm("¿Seguro que querés borrar este movimiento?")) return;
    setBorrando(id);
    const supabase = createClient();
    const { error } = await supabase.from("ericka_movimientos").delete().eq("id", id);
    if (!error) {
      setMovimientos((prev) => prev.filter((m) => m.id !== id));
    }
    setBorrando(null);
  }

  function iniciarEditOptimos() {
    if (!optimos) return;
    const edit: Record<string, string> = {};
    for (const sku of SKUS) edit[sku.key] = String(optimos[sku.key]);
    setOptimosEdit(edit);
    setEditandoOptimos(true);
  }

  async function guardarOptimos() {
    setGuardandoOptimos(true);
    const supabase = createClient();
    const update: Record<string, number> = {};
    for (const sku of SKUS) update[`${sku.key}_optimo`] = parseInt(optimosEdit[sku.key]) || 0;
    const { data: cfg } = await supabase.from("ericka_config").select("id").limit(1).single();
    const { error } = cfg
      ? await supabase.from("ericka_config").update(update).eq("id", cfg.id)
      : await supabase.from("ericka_config").insert(update);
    if (!error) {
      const newOpt = { ...optimos! };
      for (const sku of SKUS) newOpt[sku.key] = update[`${sku.key}_optimo`];
      setOptimos(newOpt);
    }
    setEditandoOptimos(false);
    setGuardandoOptimos(false);
  }

  if (loading || !optimos) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stock = calcularStock(movimientos);

  const totalActual   = SKUS.reduce((s, sku) => s + stock[sku.key], 0);
  const totalOptimo   = SKUS.reduce((s, sku) => s + optimos[sku.key], 0);
  const totalAprobado = SKUS.reduce((s, sku) => s + (parseInt(aprobados[sku.key]) || 0), 0);
  const totalFinal    = totalActual + totalAprobado;
  const margenGlobal  = totalOptimo > 0 ? Math.round((totalFinal / totalOptimo) * 100) : 0;

  const inputClass =
    "w-24 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  return (
    <div className="p-6 space-y-8">

      {/* ── HEADER ── */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control Ericka</h1>
          <p className="text-muted-foreground text-sm">Inventario en consignación</p>
        </div>
        <Link
          href="/inventario/movimiento"
          className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold rounded-lg px-4 py-2.5 hover:opacity-80 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Cambio
        </Link>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Inv. actual",    value: totalActual,         sub: "unidades" },
          { label: "Óptimo total",   value: totalOptimo,         sub: "unidades" },
          { label: "Prod. aprobado", value: totalAprobado,       sub: "a entregar" },
          { label: "Margen global",  value: `${margenGlobal}%`,  sub: "vs óptimo" },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          SECCIÓN 1 — TABLA DE CONTROL (5 columnas)
      ══════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Tabla de control de reposición</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingresá el producto aprobado · Guardá como recibo cuando esté listo
            </p>
          </div>
          <div className="flex items-center gap-3">
            {exito && (
              <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Recibo registrado
              </span>
            )}
            {editandoOptimos ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditandoOptimos(false)}
                  className="flex items-center gap-1.5 border border-border text-muted-foreground text-sm rounded-lg px-3 py-2 hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarOptimos}
                  disabled={guardandoOptimos}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg px-3 py-2 transition-colors"
                >
                  {guardandoOptimos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar óptimos
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={iniciarEditOptimos}
                className="flex items-center gap-1.5 border border-border text-muted-foreground text-sm rounded-lg px-3 py-2 hover:text-foreground transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar óptimos
              </button>
            )}
            <button
              type="button"
              onClick={registrarRecibo}
              disabled={guardando || editandoOptimos || !SKUS.some((sku) => (parseInt(aprobados[sku.key]) || 0) > 0)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              {guardando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                : <><Plus className="w-4 h-4" /> Registrar recibo</>
              }
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: "SKU",             align: "left"   },
                  { label: "Inv. actual",     align: "center" },
                  { label: "Óptimo",          align: "center" },
                  { label: "Prod. aprobado",  align: "center" },
                  { label: "Inv. final",      align: "center" },
                  { label: "% vs Óptimo",     align: "center" },
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
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {sku.label}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">{sku.marca}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-foreground">{actual}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {editandoOptimos ? (
                        <input
                          type="number"
                          min={0}
                          value={optimosEdit[sku.key] ?? ""}
                          onChange={(e) => setOptimosEdit((p) => ({ ...p, [sku.key]: e.target.value }))}
                          className="w-20 bg-background border border-amber-500/50 rounded-lg px-2 py-1 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      ) : optimo}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        value={aprobados[sku.key]}
                        onChange={(e) => setAprobado(sku.key, e.target.value)}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-foreground">{final}</td>
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

              {/* Fila totales */}
              <tr className="bg-secondary/30 border-t border-border">
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</td>
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

      {/* ══════════════════════════════════════════
          SECCIÓN 2 — REGISTRO DE MOVIMIENTOS
          Verde = ENTREGA (recibos), Rojo = todo lo demás
      ══════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setRegistroAbierto((v) => !v)}
          className="w-full px-5 py-4 border-b border-border flex justify-between items-center hover:bg-secondary/30 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-base font-semibold text-foreground">Registro de movimientos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-green-500 font-medium">Verde</span> = recibos ·{" "}
              <span className="text-red-400 font-medium">Rojo</span> = despachos · {movimientos.length} registros
            </p>
          </div>
          {registroAbierto
            ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          }
        </button>
        <div className={`overflow-x-auto ${registroAbierto ? "" : "hidden"}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 whitespace-nowrap">Fecha</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Referencia</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3 whitespace-nowrap">Tipo</th>
                {SKUS.map((sku) => (
                  <th key={sku.key} className="text-center text-xs text-muted-foreground font-medium px-2 py-3 whitespace-nowrap">
                    {sku.label.split(" ")[0]}
                  </th>
                ))}
                <th className="text-center text-xs text-muted-foreground font-medium px-3 py-3">Total</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => {
                const esEntrega = m.tipo === "RECIBO" || m.tipo === "ENTREGA";
                const rowColor  = esEntrega
                  ? "bg-green-500/5 border-green-500/10"
                  : "border-border/50";
                const textColor = esEntrega ? "text-green-400" : "text-red-400";

                return (
                  <tr key={m.id} className={`border-b ${rowColor}`}>
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(m.fecha), "dd MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground max-w-[220px] truncate">
                      {m.referencia ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        esEntrega
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : m.tipo === "DEVOLUCION"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : m.tipo === "AJUSTE"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {m.tipo}
                      </span>
                    </td>
                    {SKUS.map((sku) => {
                      const val = (m[sku.key as keyof Movimiento] as number) ?? 0;
                      return (
                        <td key={sku.key} className={`px-2 py-2 text-center text-xs font-semibold ${
                          val === 0 ? "text-muted-foreground/20" : textColor
                        }`}>
                          {val === 0 ? "·" : val > 0 ? `+${val}` : val}
                        </td>
                      );
                    })}
                    <td className={`px-3 py-2 text-center text-xs font-bold ${textColor}`}>
                      {m.total_unidades > 0 ? `+${m.total_unidades}` : m.total_unidades}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => borrarMovimiento(m.id)}
                        disabled={borrando === m.id}
                        className="text-muted-foreground/30 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Borrar movimiento"
                      >
                        {borrando === m.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default function InventarioPage() {
  return <InventarioEricka />;
}
