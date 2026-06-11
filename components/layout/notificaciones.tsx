"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Bell, PackagePlus, RefreshCw, X } from "lucide-react";
import { formatDateTime, labelEstado, cn } from "@/lib/utils";

interface Evento {
  id: string;
  tipo: "nueva_orden" | "cambio_estado";
  ordenId: string;
  titulo: string;
  detalle: string;
  fecha: string;
}

const SEEN_KEY = "cibum-notif-seen";

export function Notificaciones() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>("");

  useEffect(() => {
    setLastSeen(localStorage.getItem(SEEN_KEY) ?? new Date(0).toISOString());
  }, []);

  const fetchEventos = useCallback(async () => {
    try {
      const supabase = createClient();

      const [{ data: ordenes }, { data: historial }] = await Promise.all([
        supabase
          .from("ordenes")
          .select("id, created_at, usuario_registro, venta_de, cliente:clientes(nombre)")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("orden_historial")
          .select("id, orden_id, campo_cambiado, estado_nuevo, usuario, fecha")
          .order("fecha", { ascending: false })
          .limit(25),
      ]);

      const evs: Evento[] = [];

      (ordenes ?? []).forEach((o) => {
        if (!o.created_at) return;
        const clienteData = o.cliente as { nombre: string } | { nombre: string }[] | null;
        const cliente = Array.isArray(clienteData)
          ? clienteData[0]?.nombre
          : clienteData?.nombre;
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
          titulo: `${area} → ${labelEstado(h.estado_nuevo ?? "")}`,
          detalle: h.usuario ? `Por ${h.usuario}` : "",
          fecha: h.fecha,
        });
      });

      evs.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
      setEventos(evs.slice(0, 40));
    } catch (err) {
      console.error("Error cargando notificaciones:", err);
    }
  }, []);

  useEffect(() => {
    fetchEventos();

    const supabase = createClient();
    // Nombre único por montaje — evita reutilizar un canal ya suscrito
    const channel = supabase
      .channel(`notificaciones-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ordenes" }, fetchEventos)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orden_historial" }, fetchEventos)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEventos]);

  const noLeidos = eventos.filter((e) => e.fecha > lastSeen).length;

  function abrirPanel() {
    setOpen(!open);
    if (!open) {
      const ahora = new Date().toISOString();
      localStorage.setItem(SEEN_KEY, ahora);
      // Esperar a que cierre para resetear el contador
      setTimeout(() => setLastSeen(ahora), 300);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={abrirPanel}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {noLeidos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {noLeidos > 99 ? "99+" : noLeidos}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay para cerrar al hacer clic afuera */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Actividad reciente</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {eventos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin actividad reciente</p>
              ) : (
                eventos.map((e) => (
                  <Link
                    key={e.id}
                    href={`/ordenes/${e.ordenId}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors",
                      e.fecha > lastSeen && "bg-secondary/30"
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {e.tipo === "nueva_orden" ? (
                        <PackagePlus className="w-4 h-4 text-green-500" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{e.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.detalle && `${e.detalle} · `}{formatDateTime(e.fecha)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
