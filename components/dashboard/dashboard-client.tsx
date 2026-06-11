"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Orden } from "@/types";
import { KPICards } from "./kpi-cards";
import { AlertasPanel } from "./alertas-panel";
import { OrdenesActivasTable } from "./ordenes-activas-table";
import { TendenciaChart } from "./tendencia-chart";
import { detectarAlertas } from "@/lib/utils";

export function DashboardClient({ ordenes: initial }: { ordenes: Orden[] }) {
  const [ordenes, setOrdenes] = useState<Orden[]>(initial);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`ordenes-realtime-${Date.now()}-${Math.random().toString(36).slice(2)}`)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const alertas = detectarAlertas(ordenes);
  const activos = ordenes.filter(
    (o) => !["ENTREGADO", "CANCELADO", "COBRADO"].includes(o.estado_comercial)
  );
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const entregadosSemana = ordenes.filter(
    (o) =>
      o.estado_comercial === "ENTREGADO" &&
      new Date(o.updated_at) >= inicioSemana
  ).length;

  const kpis = {
    activos: activos.length,
    pendientes: ordenes.filter((o) => o.estado_comercial === "PENDIENTE").length,
    atrasados: alertas.filter((a) => a.tipo === "ATRASADO").length,
    entregadosSemana,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen operativo en tiempo real
        </p>
      </div>

      <KPICards kpis={kpis} />

      {alertas.length > 0 && <AlertasPanel alertas={alertas} />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TendenciaChart ordenes={ordenes} />
        </div>
        <div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Por Estado Comercial
            </h3>
            <div className="space-y-2">
              {[
                "PENDIENTE",
                "FACTURADO",
                "ENTREGADO",
                "COBRADO",
                "CANCELADO",
              ].map((estado) => {
                const count = ordenes.filter(
                  (o) => o.estado_comercial === estado
                ).length;
                return (
                  <div
                    key={estado}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-muted-foreground">
                      {estado.replace("_", " ")}
                    </span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <OrdenesActivasTable ordenes={activos.slice(0, 20)} />
    </div>
  );
}
