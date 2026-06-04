"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cliente, Producto } from "@/types";
import {
  VENDEDORES,
  MEDIOS_ENVIO,
  METODOS_PAGO,
  FORMAS_PAGO,
  VENTA_A_OPTIONS,
  VENTA_DE_OPTIONS,
  MEDIO_CONTACTO_OPTIONS,
  getMesActual,
} from "@/lib/utils";
import { ArrowLeft, Plus, Minus, Loader2, UserPlus } from "lucide-react";
import { format } from "date-fns";

interface ItemRow {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

export function OrdenForm({
  clientes: initialClientes,
  productos,
  userEmail,
  ordenId,
}: {
  clientes: Cliente[];
  productos: Producto[];
  userEmail: string;
  ordenId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState(initialClientes);
  const [showNewCliente, setShowNewCliente] = useState(false);

  // Cliente
  const [clienteId, setClienteId] = useState("");
  const [newCliente, setNewCliente] = useState({
    nombre: "",
    nit: "",
    telefono: "",
    direccion: "",
    medio_contacto: "WHATSAPP",
    tipo: "NUEVO",
  });

  // Orden fields
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaCobro, setFechaCobro] = useState("");
  const [ventaA, setVentaA] = useState("");
  const [ventaDe, setVentaDe] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [medioEnvio, setMedioEnvio] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [formaPago, setFormaPago] = useState("CONTADO");
  const [comentarios, setComentarios] = useState("");
  const [tipoCliente, setTipoCliente] = useState("EXISTENTE");

  // Items
  const [items, setItems] = useState<ItemRow[]>([
    { producto_id: "", cantidad: 1, precio_unitario: 0 },
  ]);

  const productoById = useMemo(() => {
    return Object.fromEntries(productos.map((p) => [p.id, p]));
  }, [productos]);

  const totalUnidades = items.reduce((s, i) => s + i.cantidad, 0);
  const totalQ = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  function updateItem(idx: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "producto_id") {
        const prod = productoById[value as string];
        if (prod) next[idx].precio_unitario = prod.precio_unitario;
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      let finalClienteId = clienteId;

      if (showNewCliente && newCliente.nombre) {
        const { data: created } = await supabase
          .from("clientes")
          .insert(newCliente)
          .select()
          .single();
        if (created) {
          finalClienteId = created.id;
          setClientes((prev) => [...prev, created]);
        }
      }

      const validItems = items.filter((i) => i.producto_id && i.cantidad > 0);

      const { data: orden, error } = await supabase
        .from("ordenes")
        .insert({
          cliente_id: finalClienteId || null,
          fecha_entrega_comprometida: fechaEntrega || null,
          fecha_cobro: fechaCobro || null,
          venta_a: ventaA || null,
          venta_de: ventaDe || null,
          vendedor: vendedor || null,
          medio_envio: medioEnvio || null,
          metodo_pago: metodoPago || null,
          forma_pago: formaPago || null,
          comentarios: comentarios || null,
          tipo_cliente: tipoCliente,
          mes: getMesActual(),
          total_unidades: totalUnidades,
          total_q: totalQ,
          usuario_registro: userEmail,
        })
        .select()
        .single();

      if (error || !orden) throw error;

      if (validItems.length > 0) {
        await supabase.from("orden_items").insert(
          validItems.map((i) => ({
            orden_id: orden.id,
            producto_id: i.producto_id,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
          }))
        );
      }

      router.push(`/ordenes/${orden.id}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  const marcas = Array.from(new Set(productos.map((p) => p.marca)));

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/ordenes" className="text-muted-foreground hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">Nueva Orden</h1>
      </div>

      {/* Cliente */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-white">Cliente</h3>
          <button
            type="button"
            onClick={() => setShowNewCliente(!showNewCliente)}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showNewCliente ? "Seleccionar existente" : "Nuevo cliente"}
          </button>
        </div>

        {!showNewCliente ? (
          <select
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value);
              const c = clientes.find((cl) => cl.id === e.target.value);
              if (c) setTipoCliente(c.tipo ?? "EXISTENTE");
            }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.nit ? `(NIT: ${c.nit})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Nombre *", key: "nombre", required: true },
              { label: "NIT (CF si aplica)", key: "nit" },
              { label: "Teléfono", key: "telefono" },
              { label: "Dirección", key: "direccion" },
            ].map(({ label, key, required }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input
                  value={newCliente[key as keyof typeof newCliente]}
                  onChange={(e) => setNewCliente((p) => ({ ...p, [key]: e.target.value }))}
                  required={required}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Medio contacto</label>
              <select
                value={newCliente.medio_contacto}
                onChange={(e) => setNewCliente((p) => ({ ...p, medio_contacto: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {MEDIO_CONTACTO_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Tipo cliente</label>
              <select
                value={newCliente.tipo}
                onChange={(e) => setNewCliente((p) => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="NUEVO">NUEVO</option>
                <option value="EXISTENTE">EXISTENTE</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Detalles de la orden */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Detalles</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Fecha entrega</label>
            <input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Fecha cobro</label>
            <input
              type="date"
              value={fechaCobro}
              onChange={(e) => setFechaCobro(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {([
            { label: "Venta a", value: ventaA, set: setVentaA, options: VENTA_A_OPTIONS },
            { label: "Venta de", value: ventaDe, set: setVentaDe, options: VENTA_DE_OPTIONS },
            { label: "Vendedor", value: vendedor, set: setVendedor, options: VENDEDORES },
            { label: "Medio envío", value: medioEnvio, set: setMedioEnvio, options: MEDIOS_ENVIO },
            { label: "Método pago", value: metodoPago, set: setMetodoPago, options: METODOS_PAGO },
            { label: "Forma pago", value: formaPago, set: setFormaPago, options: FORMAS_PAGO },
          ] as const).map(({ label, value, set, options }) => (
            <div key={label}>
              <label className="block text-xs text-muted-foreground mb-1">{label}</label>
              <select
                value={value}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Seleccionar...</option>
                {(options as readonly string[]).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Comentarios</label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
          />
        </div>
      </div>

      {/* Productos */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Productos</h3>

        <div className="space-y-3">
          {marcas.map((marca) => {
            const prods = productos.filter((p) => p.marca === marca);
            return (
              <div key={marca}>
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  {marca}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {prods.map((prod) => {
                    const itemIdx = items.findIndex((i) => i.producto_id === prod.id);
                    const item = itemIdx >= 0 ? items[itemIdx] : null;
                    const qty = item?.cantidad ?? 0;

                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          qty > 0
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <div>
                          <p className="text-sm text-white">{prod.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            Q {prod.precio_unitario.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (qty === 0) return;
                              if (qty === 1) {
                                setItems((prev) =>
                                  prev.filter((i) => i.producto_id !== prod.id)
                                );
                              } else {
                                setItems((prev) =>
                                  prev.map((i) =>
                                    i.producto_id === prod.id
                                      ? { ...i, cantidad: i.cantidad - 1 }
                                      : i
                                  )
                                );
                              }
                            }}
                            disabled={qty === 0}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-white hover:border-amber-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm text-white font-medium">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (qty === 0) {
                                setItems((prev) => [
                                  ...prev,
                                  {
                                    producto_id: prod.id,
                                    cantidad: 1,
                                    precio_unitario: prod.precio_unitario,
                                  },
                                ]);
                              } else {
                                setItems((prev) =>
                                  prev.map((i) =>
                                    i.producto_id === prod.id
                                      ? { ...i, cantidad: i.cantidad + 1 }
                                      : i
                                  )
                                );
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-white hover:border-amber-500/50 transition-colors"
                          >
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

        {/* Totals */}
        <div className="border-t border-border pt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {totalUnidades} unidades
          </div>
          <div className="text-lg font-bold text-amber-400">
            Total: Q {totalQ.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Link
          href="/ordenes"
          className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Orden"
          )}
        </button>
      </div>
    </form>
  );
}
