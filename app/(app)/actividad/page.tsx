"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, PackagePlus, RefreshCw, ExternalLink } from "lucide-react";
import { formatDateTime, labelEstado } from "@/lib/utils";

interface Evento {
  id: string;
  tipo: "nueva_orden" | "cambio_estado";
  ordenId: string;
  titulo: string;
  detalle: string;
  fecha: string;
}

export default function ActividadPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "nueva_orden" | "cambio_estado">("todos");

  useEffect(() => {
    async function fetchEventos() {
      try {
        const supabase = createClient();

        const [{ data: ordenes }, { data: historial }] = await Promise.all([
          supabase
            .from("ordenes")
            .select("id, created_at, usuario_registro, venta_de, cliente:clientes(nombre)")
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("orden_historial")
            .select("id, orden_id, campo_cambiado, estado_anterior, estado_nuevo, usuario, fecha, notas")
            .order("fecha", { ascending: false })
            .limit(100),
        ]);

        const evs: Evento[] = [];

        (ordenes ?? []).forEach((o) => {
          if (!o.created_at) return;
          const clienteData = o.cliente as { nombre: string } | { nombre: string }[] | null;
          const cliente = Array.isArray(clienteData) ? clienteData[0]?.nombre : clienteData?.nombre;
          evs.push({
            id: `orden-${o.id}`,
            tipo: "nueva_orden",
            ordenId: o.id,
            titulo: `Nueva orden — ${cliente ?? o.venta_de ?? "cliente"}`,
            detalle: o.usuario_registro ? `Registrada por ${o.usuario_registro}` : "Registrada",
            fecha: o.created_at,
          });
        });

        (historial ?? []).forEach((h) => {
          if (!h.fecha || !h.orden_id) return;
          const area = h.campo_cambiado === "estado_produccion" ? "Producción" : "Comercial";
          evs.push({
            id: `hist-${h.id}`,
            tipo: "cambio_estado",
            ordenId: h.orden_id,
            titulo: `${area}: ${labelEstado(h.estado_anterior ?? "")} → ${labelEstado(h.estado_nuevo ?? "")}`,
            detalle: h.usuario ? `Por ${h.usuario}${h.notas ? ` — "${h.notas}"` : ""}` : "",
            fecha: h.fecha,
          });
        });

        evs.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
        setEventos(evs);
      } catch (err) {
        console.error("Error cargando actividad:", err);
      }
      setLoading(false);
    }
    fetchEventos();
  }, []);

  const filtrados = filtro === "todos" ? eventos : eventos.filter((e) => e.tipo === filtro);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Actividad</h1>
        <p className="text-muted-foreground text-sm">Todo lo que ha pasado en el sistema</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {([
          { key: "todos", label: "Todo" },
          { key: "nueva_orden", label: "Órdenes nuevas" },
          { key: "cambio_estado", label: "Cambios de estado" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              filtro === key
                ? "bg-foreground text-background border-foreground font-medium"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtrados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Sin actividad</p>
        ) : (
          <div className="divide-y divide-border">
            {filtrados.map((e) => (
              <Link
                key={e.id}
                href={`/ordenes/${e.ordenId}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {e.tipo === "nueva_orden" ? (
                    <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <PackagePlus className="w-4 h-4 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{e.titulo}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {e.detalle && `${e.detalle} · `}{formatDateTime(e.fecha)}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
