import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SKUS, stockVacio } from "@/lib/inventario";
import { agregarMovimientoErickaSheet } from "@/lib/google-sheets";

const PRODUCTO_SKU: Record<string, string> = {
  "cbaa1e02-aafa-489d-b369-4f8cf636c38e": "especial_daniel",
  "db599147-9b28-41cf-b965-d370eb087da0": "honey_chipotle",
  "3b83cdc0-5564-4695-ba5e-3cc78974b468": "lemon_pepper",
  "2f0dadec-ffc6-42d1-8d50-2281eb81ab4d": "teriyaki",
  "f84e2d8a-67a2-4cce-b18f-80a9cf588408": "palitos_26g",
  "e8389401-cd45-48e1-a0d3-94685f93865d": "jerky_35g",
  "de80e846-0605-4024-83c5-2703dfdb3977": "jerky_81g",
};

export async function POST(req: NextRequest) {
  try {
    const { orden_id, cliente_nombre } = await req.json();
    if (!orden_id) return NextResponse.json({ error: "Falta orden_id" }, { status: 400 });

    const supabase = await createClient();

    const { data: items, error: itemsError } = await supabase
      .from("orden_items")
      .select("cantidad, producto_id")
      .eq("orden_id", orden_id);

    if (itemsError) {
      console.error("[DESPACHO API] Error fetching items:", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const skuCounts = stockVacio();
    for (const item of items ?? []) {
      const key = PRODUCTO_SKU[item.producto_id];
      if (key) skuCounts[key as keyof typeof skuCounts] += item.cantidad;
    }

    const totalUnidades = SKUS.reduce((s, sku) => s + skuCounts[sku.key], 0);
    if (totalUnidades === 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: "sin items Ericka" });
    }

    const payload: Record<string, unknown> = {
      fecha: new Date().toISOString().slice(0, 10),
      tipo: "DESPACHO",
      referencia: `Orden ${orden_id.slice(0, 8).toUpperCase()} — ${cliente_nombre ?? ""}`,
      notas: "Generado automáticamente al marcar como Entregado",
      total_unidades: -totalUnidades,
    };
    for (const sku of SKUS) payload[sku.key] = -skuCounts[sku.key];

    const { error: insertError } = await supabase.from("ericka_movimientos").insert(payload);
    if (insertError) {
      console.error("[DESPACHO API] Error inserting despacho:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Sync a Control Ericka sheet (fire and forget)
    agregarMovimientoErickaSheet(payload).catch((e) =>
      console.error("[DESPACHO API] Sheets sync error:", e)
    );

    return NextResponse.json({ ok: true, totalUnidades });
  } catch (e) {
    console.error("[DESPACHO API] Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
