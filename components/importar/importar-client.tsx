"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { getMesActual } from "@/lib/utils";

interface FilaExcel {
  "Marca temporal": string;
  "FECHA ENTREGA": string;
  "FECHA DE COBRO": string;
  "ESTADO PRODUCCIÓN": string;
  "ESTADO BACKOFFICE": string;
  "VENTA A": string;
  "VENTA DE": string;
  "ESPECIAL DE DANIEL": number;
  "HONEY CHIPOTLE": number;
  "LEMON PEPPER": number;
  "TERIYAKI": number;
  "SABOR DE TEMPORADA": number;
  "STICKS 26GR": number;
  "JERKY 35GR": number;
  "JERKY 81GR": number;
  "TOTAL UNIDADES": number;
  "TOTAL Q": number | string;
  "NIT": string;
  "NOMBRE CLIENTE": string;
  "NÚMERO DE TELÉFONO": string;
  "DIRECCIÓN DE ENTREGA": string;
  "MEDIO DE CONTACTO": string;
  "USUARIO": string;
  "COMENTARIOS ADICIONALES": string;
  "MEDIO DE ENVIÓ": string;
  "MÉTODO DE PAGO": string;
  "FORMA DE PAGO": string;
  "PEDIDO SUBIDO POR": string;
  "MES": string;
  "VENTA CLIENTE": string;
  "TIPO DE CLIENTE": string;
}

// Mapeo de estados del Excel a estados de la app
function mapEstadoProduccion(estado: string): string {
  const map: Record<string, string> = {
    "RECIBIDO": "RECIBIDO",
    "EN PREPARACIÓN": "EN_PREPARACION",
    "EN PREPARACION": "EN_PREPARACION",
    "EMPACADO": "EMPACADO",
    "ENVIADO": "ENVIADO",
  };
  return map[estado?.trim()?.toUpperCase()] ?? "RECIBIDO";
}

function mapEstadoComercial(estado: string): string {
  const map: Record<string, string> = {
    "PENDIENTE": "PENDIENTE",
    "FACTURADO": "FACTURADO",
    "GESTION PROGRAMADA": "GESTION_PROGRAMADA",
    "GESTIÓN PROGRAMADA": "GESTION_PROGRAMADA",
    "GUIA GENERADA": "GUIA_GENERADA",
    "GUÍA GENERADA": "GUIA_GENERADA",
    "ENVIADO": "ENVIADO",
    "ENTREGADO": "ENTREGADO",
    "CANCELADO": "CANCELADO",
    "COBRADO": "COBRADO",
  };
  return map[estado?.trim()?.toUpperCase()] ?? "PENDIENTE";
}

function parseTotal(val: number | string): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/[Q,\s]/g, "")) || 0;
}

function parseDate(val: string): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export function ImportarClient() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    exitosos: number;
    errores: number;
    mensajes: string[];
  } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResultado(null);

    try {
      const { read, utils } = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: FilaExcel[] = utils.sheet_to_json(ws, { raw: false });

      const supabase = createClient();
      const mensajes: string[] = [];
      let exitosos = 0;
      let errores = 0;

      // Obtener productos de la BD
      const { data: productos } = await supabase
        .from("productos")
        .select("*");

      const productoMap: Record<string, string> = {};
      const precioMap: Record<string, number> = {};
      if (productos) {
        productos.forEach((p) => {
          const key = p.nombre.toUpperCase().trim();
          productoMap[key] = p.id;
          precioMap[key] = p.precio_unitario;
        });
      }

      for (let i = 0; i < rows.length; i++) {
        const fila = rows[i];
        const nombreCliente = fila["NOMBRE CLIENTE"]?.trim();
        if (!nombreCliente) continue;

        try {
          // Buscar o crear cliente
          let clienteId: string | null = null;
          const nit = fila["NIT"]?.trim() || null;

          const { data: clienteExistente } = await supabase
            .from("clientes")
            .select("id")
            .eq("nombre", nombreCliente)
            .maybeSingle();

          if (clienteExistente) {
            clienteId = clienteExistente.id;
          } else {
            const { data: nuevoCliente } = await supabase
              .from("clientes")
              .insert({
                nombre: nombreCliente,
                nit: nit,
                telefono: fila["NÚMERO DE TELÉFONO"]?.trim() || null,
                direccion: fila["DIRECCIÓN DE ENTREGA"]?.trim() || null,
                medio_contacto: fila["MEDIO DE CONTACTO"]?.trim() || null,
                tipo: fila["TIPO DE CLIENTE"]?.trim() || "EXISTENTE",
              })
              .select()
              .single();
            if (nuevoCliente) clienteId = nuevoCliente.id;
          }

          const totalQ = parseTotal(fila["TOTAL Q"]);
          const totalUnidades = parseInt(String(fila["TOTAL UNIDADES"])) || 0;

          // Crear orden
          const { data: orden, error: ordenError } = await supabase
            .from("ordenes")
            .insert({
              fecha_ingreso: fila["Marca temporal"] ? new Date(fila["Marca temporal"]).toISOString() : new Date().toISOString(),
              fecha_entrega_comprometida: parseDate(fila["FECHA ENTREGA"]),
              fecha_cobro: parseDate(fila["FECHA DE COBRO"]),
              cliente_id: clienteId,
              venta_a: fila["VENTA A"]?.trim() || null,
              venta_de: fila["VENTA DE"]?.trim() || fila["VENTA CLIENTE"]?.trim() || null,
              estado_produccion: mapEstadoProduccion(fila["ESTADO PRODUCCIÓN"] || ""),
              estado_comercial: mapEstadoComercial(fila["ESTADO BACKOFFICE"] || ""),
              medio_envio: fila["MEDIO DE ENVIÓ"]?.trim() || null,
              metodo_pago: fila["MÉTODO DE PAGO"]?.trim() || null,
              forma_pago: fila["FORMA DE PAGO"]?.trim() || null,
              vendedor: fila["USUARIO"]?.trim() || fila["PEDIDO SUBIDO POR"]?.trim() || null,
              usuario_registro: fila["PEDIDO SUBIDO POR"]?.trim() || null,
              comentarios: fila["COMENTARIOS ADICIONALES"]?.trim() || null,
              total_unidades: totalUnidades,
              total_q: totalQ,
              mes: fila["MES"]?.trim() || getMesActual(),
              tipo_cliente: fila["TIPO DE CLIENTE"]?.trim() || null,
            })
            .select()
            .single();

          if (ordenError || !orden) {
            errores++;
            mensajes.push(`Fila ${i + 2}: Error al crear orden para ${nombreCliente}`);
            continue;
          }

          // Crear items de productos
          const productosColumnas: { col: string; nombre: string }[] = [
            { col: "ESPECIAL DE DANIEL", nombre: "ESPECIAL DE DANIEL" },
            { col: "HONEY CHIPOTLE", nombre: "HONEY CHIPOTLE" },
            { col: "LEMON PEPPER", nombre: "LEMON PEPPER" },
            { col: "TERIYAKI", nombre: "TERIYAKI" },
            { col: "SABOR DE TEMPORADA", nombre: "SABOR DE TEMPORADA" },
            { col: "STICKS 26GR", nombre: "STICKS 26GR" },
            { col: "JERKY 35GR", nombre: "JERKY 35GR" },
            { col: "JERKY 81GR", nombre: "JERKY 81GR" },
          ];

          const items = productosColumnas
            .filter((p) => {
              const qty = parseInt(String(fila[p.col as keyof FilaExcel])) || 0;
              return qty > 0;
            })
            .map((p) => {
              const qty = parseInt(String(fila[p.col as keyof FilaExcel])) || 0;
              const productoId = productoMap[p.nombre];
              const precio = precioMap[p.nombre] || 0;
              return {
                orden_id: orden.id,
                producto_id: productoId,
                cantidad: qty,
                precio_unitario: precio,
              };
            })
            .filter((i) => i.producto_id);

          if (items.length > 0) {
            await supabase.from("orden_items").insert(items);
          }

          exitosos++;
        } catch (err) {
          errores++;
          mensajes.push(`Fila ${i + 2}: Error inesperado para ${nombreCliente}`);
        }
      }

      setResultado({ exitosos, errores, mensajes });
    } catch (err) {
      setResultado({
        exitosos: 0,
        errores: 1,
        mensajes: ["Error al leer el archivo. Asegurate de que sea un .xlsx válido."],
      });
    }

    setLoading(false);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar desde Excel</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Subí el archivo ERP de Cibum (.xlsx) para importar todas las órdenes
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${loading ? "opacity-50 cursor-not-allowed" : "border-border hover:border-foreground/30"}`}>
          {loading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Importando datos...</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Hacé clic para seleccionar el archivo</p>
                <p className="text-xs text-muted-foreground mt-1">Solo archivos .xlsx</p>
              </div>
            </>
          )}
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            disabled={loading}
            onChange={handleFile}
          />
        </label>
      </div>

      {resultado && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">{resultado.exitosos} órdenes importadas</span>
            </div>
            {resultado.errores > 0 && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">{resultado.errores} errores</span>
              </div>
            )}
          </div>

          {resultado.mensajes.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {resultado.mensajes.map((m, i) => (
                <p key={i} className="text-xs text-muted-foreground">{m}</p>
              ))}
            </div>
          )}

          {resultado.exitosos > 0 && (
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-80 transition-opacity"
            >
              Ver dashboard →
            </a>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Notas importantes:</p>
        <p>• La importación no duplica clientes existentes</p>
        <p>• Los estados se mapean automáticamente al formato de la app</p>
        <p>• Si una fila no tiene nombre de cliente, se omite</p>
        <p>• Podés importar varias veces sin problema</p>
      </div>
    </div>
  );
}
