"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Orden, Cliente } from "@/types";
import {
  formatDate,
  formatQ,
  colorEstadoProduccion,
  colorEstadoComercial,
  labelEstado,
  detectarAlertas,
  ESTADOS_PRODUCCION,
  ESTADOS_COMERCIAL,
  VENDEDORES,
} from "@/lib/utils";
import { Plus, Search, Filter, ExternalLink, AlertTriangle } from "lucide-react";

const PAGE_SIZE = 20;

export function OrdenesClient({
  ordenes: initial,
  clientes,
}: {
  ordenes: Orden[];
  clientes: Cliente[];
}) {
  const [ordenes, setOrdenes] = useState<Orden[]>(initial);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [filtroEstadoProd, setFiltroEstadoProd] = useState("");
  const [filtroEstadoCom, setFiltroEstadoCom] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("ordenes-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ordenes" },
        async () => {
          const { data } = await supabase
            .from("ordenes")
            .select("*, cliente:clientes(*), orden_items(*, producto:productos(*))")
            .order("created_at", { ascending: false });
          if (data) setOrdenes(data);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const alertaMap = useMemo(() => {
    const map = new Map<string, string>();
    detectarAlertas(ordenes).forEach(({ orden, tipo }) => map.set(orden.id, tipo));
    return map;
  }, [ordenes]);

  const filtered = useMemo(() => {
    return ordenes.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.cliente?.nombre.toLowerCase().includes(q) &&
          !o.id.toLowerCase().includes(q)
        )
          return false;
      }
      if (filtroEstadoProd && o.estado_produccion !== filtroEstadoProd) return false;
      if (filtroEstadoCom && o.estado_comercial !== filtroEstadoCom) return false;
      if (filtroVendedor && o.vendedor !== filtroVendedor) return false;
      if (filtroMes && o.mes !== filtroMes) return false;
      if (filtroFechaDesde && o.fecha_ingreso < filtroFechaDesde) return false;
      if (filtroFechaHasta && o.fecha_ingreso > filtroFechaHasta + "T23:59:59") return false;
      return true;
    });
  }, [ordenes, search, filtroEstadoProd, filtroEstadoCom, filtroVendedor, filtroMes, filtroFechaDesde, filtroFechaHasta]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const meses = [...new Set(ordenes.map((o) => o.mes).filter(Boolean))];

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Órdenes</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} resultados
          </p>
        </div>
        <Link
          href="/ordenes/nueva"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar cliente..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <select
            value={filtroEstadoProd}
            onChange={(e) => { setFiltroEstadoProd(e.target.value); setPage(0); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Estado Producción</option>
            {ESTADOS_PRODUCCION.map((e) => (
              <option key={e} value={e}>{labelEstado(e)}</option>
            ))}
          </select>

          <select
            value={filtroEstadoCom}
            onChange={(e) => { setFiltroEstadoCom(e.target.value); setPage(0); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Estado Comercial</option>
            {ESTADOS_COMERCIAL.map((e) => (
              <option key={e} value={e}>{labelEstado(e)}</option>
            ))}
          </select>

          <select
            value={filtroVendedor}
            onChange={(e) => { setFiltroVendedor(e.target.value); setPage(0); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Vendedor</option>
            {VENDEDORES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <select
            value={filtroMes}
            onChange={(e) => { setFiltroMes(e.target.value); setPage(0); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Mes</option>
            {meses.map((m) => (
              <option key={m!} value={m!}>{m}</option>
            ))}
          </select>

          <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => { setFiltroFechaDesde(e.target.value); setPage(0); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => { setFiltroFechaHasta(e.target.value); setPage(0); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        {(search || filtroEstadoProd || filtroEstadoCom || filtroVendedor || filtroMes || filtroFechaDesde) && (
          <button
            onClick={() => { setSearch(""); setFiltroEstadoProd(""); setFiltroEstadoCom(""); setFiltroVendedor(""); setFiltroMes(""); setFiltroFechaDesde(""); setFiltroFechaHasta(""); setPage(0); }}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Cliente", "Ingreso", "Entrega", "Prod.", "Comercial", "Total Q", "Vendedor", ""].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted-foreground py-12">
                    No se encontraron órdenes
                  </td>
                </tr>
              ) : (
                paginated.map((orden) => {
                  const alerta = alertaMap.get(orden.id);
                  return (
                    <tr
                      key={orden.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {alerta && (
                            <AlertTriangle
                              className={`w-3.5 h-3.5 flex-shrink-0 ${
                                alerta === "ATRASADO" ? "text-red-400" : "text-amber-400"
                              }`}
                            />
                          )}
                          <div>
                            <p className="text-white font-medium">
                              {orden.cliente?.nombre ?? "—"}
                            </p>
                            {orden.venta_de && (
                              <p className="text-xs text-muted-foreground">{orden.venta_de}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(orden.fecha_ingreso)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(orden.fecha_entrega_comprometida)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${colorEstadoProduccion(orden.estado_produccion)}`}>
                          {labelEstado(orden.estado_produccion)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${colorEstadoComercial(orden.estado_comercial)}`}>
                          {labelEstado(orden.estado_comercial)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {formatQ(orden.total_q)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {orden.vendedor ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/ordenes/${orden.id}`} className="text-amber-400 hover:text-amber-300">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 py-4 border-t border-border">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
