"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cliente, Producto, Orden } from "@/types";
import {
  VENDEDORES,
  MEDIOS_ENVIO,
  METODOS_PAGO,
  FORMAS_PAGO,
  MEDIO_CONTACTO_OPTIONS,
  getMesActual,
} from "@/lib/utils";
import { PUNTOS_DE_VENTA, NIT_POR_PUNTO, getPrecio } from "@/lib/precios";
import { ArrowLeft, Plus, Minus, Loader2 } from "lucide-react";

interface ItemRow {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

const VENTA_DE_OPTIONS = ["MR.BEEF", "CIBUM", "JERKY DEALERS", "JACK LINKS"];

export function OrdenForm({
  clientes: initialClientes,
  productos,
  userEmail,
  ordenExistente,
}: {
  clientes: Cliente[];
  productos: Producto[];
  userEmail: string;
  ordenExistente?: Orden;
}) {
  const router = useRouter();
  const editando = !!ordenExistente;
  const [loading, setLoading] = useState(false);

  // Cliente
  const [clienteId] = useState(ordenExistente?.cliente_id ?? "");
  const [nombreClienteRed, setNombreClienteRed] = useState(
    ordenExistente?.venta_a === "CLIENTE REDES SOCIALES" ? (ordenExistente?.cliente?.nombre ?? "") : ""
  );
  const [nit, setNit] = useState(ordenExistente?.cliente?.nit ?? "");

  // Orden fields — precargados si estamos editando
  const esPuntoDeVenta = ordenExistente?.venta_a === "PUNTO DE VENTA";
  const [fechaEntrega, setFechaEntrega] = useState(ordenExistente?.fecha_entrega_comprometida ?? "");
  const [fechaCobro, setFechaCobro] = useState(ordenExistente?.fecha_cobro ?? "");
  const [ventaA, setVentaA] = useState(ordenExistente?.venta_a ?? "");
  const [puntoDe, setPuntoDe] = useState(esPuntoDeVenta ? (ordenExistente?.venta_de ?? "") : "");
  const [ventaDe, setVentaDe] = useState(!esPuntoDeVenta ? (ordenExistente?.venta_de ?? "") : "");
  const [vendedor, setVendedor] = useState(ordenExistente?.vendedor ?? "");
  const [medioEnvio, setMedioEnvio] = useState(ordenExistente?.medio_envio ?? "");
  const [metodoPago, setMetodoPago] = useState(ordenExistente?.metodo_pago ?? "");
  const [formaPago, setFormaPago] = useState(ordenExistente?.forma_pago ?? "CONTADO");
  const [comentarios, setComentarios] = useState(ordenExistente?.comentarios ?? "");
  const [tipoCliente, setTipoCliente] = useState(ordenExistente?.tipo_cliente ?? "EXISTENTE");
  const [estadoProduccion, setEstadoProduccion] = useState(ordenExistente?.estado_produccion ?? "RECIBIDO");
  const [estadoComercial, setEstadoComercial] = useState(ordenExistente?.estado_comercial ?? "PENDIENTE");

  // Datos de contacto para cliente de redes sociales
  const [telefonoRed, setTelefonoRed] = useState("");
  const [direccionRed, setDireccionRed] = useState("");
  const [medioContactoRed, setMedioContactoRed] = useState("");
  const [usuarioRed, setUsuarioRed] = useState(ordenExistente?.usuario_red ?? "");

  // Items — precargados si estamos editando
  const [items, setItems] = useState<Record<string, number>>(() => {
    if (!ordenExistente?.orden_items) return {};
    const init: Record<string, number> = {};
    ordenExistente.orden_items.forEach(item => {
      if (item.producto_id) init[item.producto_id] = item.cantidad;
    });
    return init;
  });

  // Canal activo para precios
  const canalActivo = ventaA === "CLIENTE REDES SOCIALES"
    ? "CLIENTE REDES SOCIALES"
    : puntoDe || "OTROS";

  const marcas = useMemo(() => Array.from(new Set(productos.map((p) => p.marca))), [productos]);

  const totalUnidades = Object.values(items).reduce((s, qty) => s + qty, 0);
  const totalQ = productos.reduce((s, prod) => {
    const qty = items[prod.id] ?? 0;
    if (qty === 0) return s;
    return s + qty * getPrecio(prod.nombre, canalActivo);
  }, 0);

  function setQty(productoId: string, qty: number) {
    setItems(prev => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[productoId];
        return next;
      }
      return { ...prev, [productoId]: qty };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      let finalClienteId = clienteId;

      // Determinar el nombre del cliente según el tipo de venta
      const nombreCliente = ventaA === "CLIENTE REDES SOCIALES"
        ? nombreClienteRed.trim()
        : puntoDe.trim();

      if (nombreCliente) {
        // Buscar cliente existente por nombre, o crearlo
        const { data: existente } = await supabase
          .from("clientes")
          .select("id")
          .ilike("nombre", nombreCliente)
          .maybeSingle();

        if (existente) {
          finalClienteId = existente.id;
          // Actualizar NIT si se ingresó uno
          if (nit.trim()) {
            await supabase.from("clientes").update({ nit: nit.trim() }).eq("id", existente.id);
          }
        } else {
          const { data: created } = await supabase
            .from("clientes")
            .insert({
              nombre: nombreCliente,
              nit: nit.trim() || null,
              telefono: ventaA === "CLIENTE REDES SOCIALES" ? telefonoRed || null : null,
              direccion: ventaA === "CLIENTE REDES SOCIALES" ? direccionRed || null : null,
              medio_contacto: ventaA === "CLIENTE REDES SOCIALES" ? medioContactoRed || null : "PUNTO DE VENTA",
              tipo: ventaA === "CLIENTE REDES SOCIALES" ? "NUEVO" : "EXISTENTE",
            })
            .select()
            .single();
          if (created) finalClienteId = created.id;
        }
      }

      const validItems = Object.entries(items)
        .filter(([, qty]) => qty > 0)
        .map(([productoId, qty]) => {
          const prod = productos.find(p => p.id === productoId);
          const precio_unitario = prod ? getPrecio(prod.nombre, canalActivo) : 0;
          return {
            producto_id: productoId,
            cantidad: qty,
            precio_unitario,
            subtotal: qty * precio_unitario,
          };
        });

      const ventaAFinal = ventaA;
      const ventaDeFinal = ventaA === "PUNTO DE VENTA" ? puntoDe : ventaDe || null;

      const datosOrden = {
        cliente_id: finalClienteId || null,
        fecha_entrega_comprometida: fechaEntrega || null,
        fecha_cobro: fechaCobro || null,
        venta_a: ventaAFinal || null,
        venta_de: ventaDeFinal || null,
        estado_produccion: estadoProduccion,
        estado_comercial: estadoComercial,
        vendedor: vendedor || null,
        medio_envio: medioEnvio || null,
        metodo_pago: metodoPago || null,
        forma_pago: formaPago || null,
        comentarios: comentarios || null,
        tipo_cliente: tipoCliente,
        usuario_red: usuarioRed || null,
        total_unidades: totalUnidades,
        total_q: totalQ,
      };

      // Si es cliente de redes sociales, actualizar datos de contacto del cliente
      if (ventaA === "CLIENTE REDES SOCIALES" && finalClienteId && (telefonoRed || direccionRed || medioContactoRed)) {
        await supabase
          .from("clientes")
          .update({
            ...(telefonoRed && { telefono: telefonoRed }),
            ...(direccionRed && { direccion: direccionRed }),
            ...(medioContactoRed && { medio_contacto: medioContactoRed }),
          })
          .eq("id", finalClienteId);
      }

      let ordenId: string;

      if (editando && ordenExistente) {
        // Actualizar orden existente
        const { error } = await supabase
          .from("ordenes")
          .update({ ...datosOrden, updated_at: new Date().toISOString() })
          .eq("id", ordenExistente.id);
        if (error) throw error;

        // Reemplazar items
        await supabase.from("orden_items").delete().eq("orden_id", ordenExistente.id);
        ordenId = ordenExistente.id;
      } else {
        // Crear orden nueva
        const { data: orden, error } = await supabase
          .from("ordenes")
          .insert({
            ...datosOrden,
            mes: getMesActual(),
            usuario_registro: userEmail,
          })
          .select().single();
        if (error || !orden) throw error;
        ordenId = orden.id;
      }

      if (validItems.length > 0) {
        await supabase.from("orden_items").insert(
          validItems.map(i => ({ ...i, orden_id: ordenId }))
        );
      }

      router.push(`/ordenes/${ordenId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/ordenes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">
          {editando ? "Editar Orden" : "Nueva Orden"}
        </h1>
      </div>

      {/* Detalles */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Detalles</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Fecha entrega</label>
            <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Fecha cobro</label>
            <input type="date" value={fechaCobro} onChange={e => setFechaCobro(e.target.value)} className={inputClass} />
          </div>

          {/* VENTA A */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Venta a</label>
            <select value={ventaA} onChange={e => { setVentaA(e.target.value); setPuntoDe(""); }} className={inputClass}>
              <option value="">Seleccionar...</option>
              <option value="PUNTO DE VENTA">PUNTO DE VENTA</option>
              <option value="CLIENTE REDES SOCIALES">CLIENTE REDES SOCIALES</option>
            </select>
          </div>

          {/* Punto de venta específico — solo si eligió PUNTO DE VENTA */}
          {ventaA === "PUNTO DE VENTA" && (
            <>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Punto de venta</label>
                <select
                  value={puntoDe}
                  onChange={e => {
                    setPuntoDe(e.target.value);
                    // Autorellenar NIT si lo conocemos
                    setNit(NIT_POR_PUNTO[e.target.value] ?? "");
                  }}
                  className={inputClass}
                >
                  <option value="">Seleccionar punto...</option>
                  {PUNTOS_DE_VENTA.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">NIT</label>
                <input
                  value={nit}
                  onChange={e => setNit(e.target.value)}
                  placeholder="NIT del punto de venta"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Venta de — solo si es redes sociales */}
          {ventaA === "CLIENTE REDES SOCIALES" && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Venta de</label>
              <select value={ventaDe} onChange={e => setVentaDe(e.target.value)} className={inputClass}>
                <option value="">Seleccionar...</option>
                {VENTA_DE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Vendedor</label>
            <select value={vendedor} onChange={e => setVendedor(e.target.value)} className={inputClass}>
              <option value="">Seleccionar...</option>
              {VENDEDORES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Medio envío</label>
            <select value={medioEnvio} onChange={e => setMedioEnvio(e.target.value)} className={inputClass}>
              <option value="">Seleccionar...</option>
              {MEDIOS_ENVIO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Método pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className={inputClass}>
              <option value="">Seleccionar...</option>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Forma pago</label>
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className={inputClass}>
              <option value="">Seleccionar...</option>
              {["CONTADO", "CREDITO"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Tipo cliente</label>
            <select value={tipoCliente} onChange={e => setTipoCliente(e.target.value)} className={inputClass}>
              <option value="NUEVO">NUEVO</option>
              <option value="EXISTENTE">EXISTENTE</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Comentarios</label>
          <textarea value={comentarios} onChange={e => setComentarios(e.target.value)}
            rows={2} className={`${inputClass} resize-none`} />
        </div>
      </div>

      {/* Datos de contacto — solo para cliente de redes sociales */}
      {ventaA === "CLIENTE REDES SOCIALES" && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Datos del cliente (redes sociales)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nombre del cliente</label>
              <input
                value={nombreClienteRed}
                onChange={(e) => setNombreClienteRed(e.target.value)}
                placeholder="Nombre completo del cliente"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">NIT (CF si no tiene)</label>
              <input
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="Ej: 1234567-8 o CF"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Número de teléfono</label>
              <input value={telefonoRed} onChange={e => setTelefonoRed(e.target.value)}
                placeholder="Ej: 5555-1234" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Dirección de entrega</label>
              <input value={direccionRed} onChange={e => setDireccionRed(e.target.value)}
                placeholder="Dirección completa" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Medio de contacto</label>
              <select value={medioContactoRed} onChange={e => setMedioContactoRed(e.target.value)} className={inputClass}>
                <option value="">Seleccionar...</option>
                {MEDIO_CONTACTO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Usuario (red social)</label>
              <input value={usuarioRed} onChange={e => setUsuarioRed(e.target.value)}
                placeholder="Ej: @cliente_ig" className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* Productos */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-foreground">Productos</h3>
          {canalActivo && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
              Precios: {canalActivo}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {marcas.map(marca => {
            const prods = productos.filter(p => p.marca === marca);
            return (
              <div key={marca}>
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">{marca}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {prods.map(prod => {
                    const qty = items[prod.id] ?? 0;
                    const precio = getPrecio(prod.nombre, canalActivo);
                    return (
                      <div key={prod.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${qty > 0 ? "border-foreground/30 bg-foreground/5" : "border-border bg-background"}`}>
                        <div>
                          <p className="text-sm text-foreground">{prod.nombre}</p>
                          <p className="text-xs text-muted-foreground">Q {precio.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setQty(prod.id, qty - 1)} disabled={qty === 0}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm text-foreground font-medium">{qty}</span>
                          <button type="button" onClick={() => setQty(prod.id, qty + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">{totalUnidades} unidades</div>
          <div className="text-lg font-bold text-foreground">Total: Q {totalQ.toFixed(2)}</div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Link href="/ordenes" className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </Link>
        <button type="submit" disabled={loading}
          className="flex items-center gap-2 bg-foreground hover:opacity-80 disabled:opacity-50 text-background font-semibold rounded-lg px-6 py-2.5 text-sm transition-opacity">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : (editando ? "Guardar Cambios" : "Guardar Orden")}
        </button>
      </div>
    </form>
  );
}
