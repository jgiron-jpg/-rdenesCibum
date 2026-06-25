"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SKUS, stockVacio, productoToSkuKey } from "@/lib/inventario";
import type { Orden, OrdenHistorial } from "@/types";
import {
  formatDate,
  formatDateTime,
  formatQ,
  colorEstadoProduccion,
  colorEstadoComercial,
  labelEstado,
  ESTADOS_PRODUCCION,
  ESTADOS_COMERCIAL,
} from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  Package,
  Truck,
  Edit,
  ChevronRight,
} from "lucide-react";

export function OrdenDetalle({
  orden: initialOrden,
  historial,
  userEmail,
  userRole,
}: {
  orden: Orden;
  historial: OrdenHistorial[];
  userEmail: string;
  userRole: string;
}) {
  const router = useRouter();
  const [orden, setOrden] = useState(initialOrden);
  const [savingProd, setSavingProd] = useState(false);
  const [savingCom, setSavingCom] = useState(false);
  const [notas, setNotas] = useState("");

  const canEditProd = userRole === "produccion" || userRole === "admin";
  const canEditCom = userRole === "comercial" || userRole === "admin";

  async function cambiarEstadoProduccion(nuevoEstado: string) {
    if (!canEditProd) return;
    setSavingProd(true);
    const supabase = createClient();
    const anterior = orden.estado_produccion;

    await supabase
      .from("ordenes")
      .update({ estado_produccion: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", orden.id);

    await supabase.from("orden_historial").insert({
      orden_id: orden.id,
      campo_cambiado: "estado_produccion",
      estado_anterior: anterior,
      estado_nuevo: nuevoEstado,
      usuario: userEmail,
      notas: notas || null,
    });

    setOrden((prev) => ({ ...prev, estado_produccion: nuevoEstado as Orden["estado_produccion"] }));
    setNotas("");
    setSavingProd(false);
    router.refresh();
  }

  async function cambiarEstadoComercial(nuevoEstado: string) {
    if (!canEditCom) return;
    setSavingCom(true);
    const supabase = createClient();
    const anterior = orden.estado_comercial;

    await supabase
      .from("ordenes")
      .update({ estado_comercial: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", orden.id);

    await supabase.from("orden_historial").insert({
      orden_id: orden.id,
      campo_cambiado: "estado_comercial",
      estado_anterior: anterior,
      estado_nuevo: nuevoEstado,
      usuario: userEmail,
      notas: notas || null,
    });

    // Auto-DESPACHO en inventario Ericka cuando se entrega una orden de Ericka
    if (nuevoEstado === "ENTREGADO" && orden.medio_envio === "ERICKA" && orden.orden_items?.length) {
      const skuCounts = stockVacio();
      for (const item of orden.orden_items) {
        if (!item.producto) continue;
        const key = productoToSkuKey(item.producto.nombre);
        if (key) skuCounts[key] += item.cantidad;
      }
      const totalUnidades = SKUS.reduce((s, sku) => s + skuCounts[sku.key], 0);
      if (totalUnidades > 0) {
        const payload: Record<string, unknown> = {
          fecha: new Date().toISOString().slice(0, 10),
          tipo: "DESPACHO",
          referencia: `Orden ${orden.id.slice(0, 8).toUpperCase()} — ${orden.cliente?.nombre ?? ""}`,
          notas: "Generado automáticamente al marcar como Entregado",
          total_unidades: -totalUnidades,
        };
        for (const sku of SKUS) payload[sku.key] = -skuCounts[sku.key];
        await supabase.from("ericka_movimientos").insert(payload);
      }
    }

    const ordenActualizada = { ...orden, estado_comercial: nuevoEstado };
    setOrden((prev) => ({ ...prev, estado_comercial: nuevoEstado as Orden["estado_comercial"] }));
    setNotas("");
    setSavingCom(false);

    // Sync a Google Sheets (fire and forget)
    fetch("/api/sheets/sync-orden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orden: ordenActualizada, accion: "actualizar" }),
    }).catch(() => {});

    router.refresh();
  }

  const prodIdx = ESTADOS_PRODUCCION.indexOf(orden.estado_produccion as (typeof ESTADOS_PRODUCCION)[number]);
  const comIdx = ESTADOS_COMERCIAL.indexOf(orden.estado_comercial as (typeof ESTADOS_COMERCIAL)[number]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ordenes"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {orden.cliente?.nombre ?? "Orden"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Ingresado: {formatDateTime(orden.fecha_ingreso)}
            </p>
          </div>
        </div>
        <Link
          href={`/ordenes/${orden.id}/editar`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado Producción */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Producción</h3>
          </div>

          {/* Progress */}
          <div className="flex gap-1 mb-4">
            {ESTADOS_PRODUCCION.map((e, i) => (
              <div
                key={e}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i <= prodIdx ? "bg-amber-500" : "bg-secondary"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {ESTADOS_PRODUCCION.map((e) => (
              <button
                key={e}
                disabled={!canEditProd || savingProd}
                onClick={() => cambiarEstadoProduccion(e)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  orden.estado_produccion === e
                    ? colorEstadoProduccion(e) + " ring-1 ring-amber-500/50"
                    : "border-border text-muted-foreground hover:border-amber-500/50 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {labelEstado(e)}
              </button>
            ))}
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${colorEstadoProduccion(orden.estado_produccion)}`}>
            {labelEstado(orden.estado_produccion)}
          </div>
        </div>

        {/* Estado Comercial */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Comercial</h3>
          </div>

          <div className="flex gap-1 mb-4">
            {orden.estado_comercial === "CANCELADO" ? (
              <div className="flex-1 h-1.5 rounded-full bg-red-500/50" />
            ) : (
              ESTADOS_COMERCIAL.filter(e => e !== "CANCELADO").map((e, i) => (
                <div
                  key={e}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    i <= ESTADOS_COMERCIAL.filter(e2 => e2 !== "CANCELADO").indexOf(orden.estado_comercial as typeof e)
                      ? orden.estado_comercial === "COBRADO" ? "bg-green-500" : "bg-indigo-500"
                      : "bg-secondary"
                  }`}
                />
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {ESTADOS_COMERCIAL.map((e) => (
              <button
                key={e}
                disabled={!canEditCom || savingCom}
                onClick={() => cambiarEstadoComercial(e)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  orden.estado_comercial === e
                    ? colorEstadoComercial(e) + " ring-1 ring-indigo-500/50"
                    : "border-border text-muted-foreground hover:border-indigo-500/50 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {labelEstado(e)}
              </button>
            ))}
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${colorEstadoComercial(orden.estado_comercial)}`}>
            {labelEstado(orden.estado_comercial)}
          </div>
        </div>
      </div>

      {/* Notas para cambio de estado */}
      {(canEditProd || canEditCom) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="block text-sm text-muted-foreground mb-2">
            Notas para el próximo cambio de estado (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Agregar nota..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información de la orden */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Información del Pedido</h3>
          <dl className="space-y-2.5">
            {[
              ["Cliente", orden.cliente?.nombre],
              ["NIT", orden.cliente?.nit],
              ["Venta a", orden.venta_a],
              ["Venta de", orden.venta_de],
              ["Vendedor", orden.vendedor],
              ["Medio envío", orden.medio_envio],
              ["Método pago", orden.metodo_pago],
              ["Forma pago", orden.forma_pago],
              ["Entrega comprometida", formatDate(orden.fecha_entrega_comprometida)],
              ["Fecha cobro", formatDate(orden.fecha_cobro)],
              ["Mes", orden.mes],
              ["Tipo cliente", orden.tipo_cliente],
              ["Total unidades", orden.total_unidades?.toString()],
              ["Total Q", formatQ(orden.total_q)],
            ].map(([label, value]) => (
              value ? (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-foreground font-medium">{value}</dd>
                </div>
              ) : null
            ))}
          </dl>
          {orden.comentarios && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Comentarios</p>
              <p className="text-sm text-foreground">{orden.comentarios}</p>
            </div>
          )}
        </div>

        {/* Productos */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Productos</h3>
          {orden.orden_items && orden.orden_items.length > 0 ? (
            <div className="space-y-2">
              {orden.orden_items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0"
                >
                  <div>
                    <p className="text-foreground">{item.producto?.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.producto?.marca} · {item.cantidad} × {formatQ(item.precio_unitario)}
                    </p>
                  </div>
                  <p className="text-foreground font-medium">{formatQ(item.subtotal)}</p>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm font-semibold pt-1">
                <span className="text-muted-foreground">Total</span>
                <span className="text-amber-400">{formatQ(orden.total_q)}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Sin productos registrados</p>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">
            Historial de cambios
          </h3>
        </div>
        {historial.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin historial registrado</p>
        ) : (
          <div className="space-y-3">
            {historial.map((h) => (
              <div key={h.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-foreground">
                    <span className="text-muted-foreground">{h.campo_cambiado === "estado_produccion" ? "Producción" : "Comercial"}:</span>{" "}
                    {labelEstado(h.estado_anterior)}
                    <ChevronRight className="w-3 h-3 inline text-muted-foreground mx-1" />
                    {labelEstado(h.estado_nuevo)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.usuario} · {formatDateTime(h.fecha)}
                  </p>
                  {h.notas && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">"{h.notas}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
