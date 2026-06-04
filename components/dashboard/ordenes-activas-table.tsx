import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Orden } from "@/types";
import {
  formatDate,
  formatQ,
  colorEstadoProduccion,
  colorEstadoComercial,
  labelEstado,
} from "@/lib/utils";

export function OrdenesActivasTable({ ordenes }: { ordenes: Orden[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white">
          Pedidos Activos ({ordenes.length})
        </h3>
        <Link
          href="/ordenes"
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
        >
          Ver todos <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Cliente", "Entrega", "Prod.", "Comercial", "Total Q", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left text-xs text-muted-foreground font-medium px-4 py-3"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {ordenes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No hay pedidos activos
                </td>
              </tr>
            ) : (
              ordenes.map((orden) => (
                <tr
                  key={orden.id}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {orden.cliente?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(orden.fecha_entrega_comprometida)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border font-medium ${colorEstadoProduccion(
                        orden.estado_produccion
                      )}`}
                    >
                      {labelEstado(orden.estado_produccion)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border font-medium ${colorEstadoComercial(
                        orden.estado_comercial
                      )}`}
                    >
                      {labelEstado(orden.estado_comercial)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    {formatQ(orden.total_q)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/ordenes/${orden.id}`}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
