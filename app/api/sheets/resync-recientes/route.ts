import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarOrdenSheet } from "@/lib/google-sheets";

// Re-sincroniza las últimas 100 órdenes al sheet — para uso admin
export async function POST() {
  try {
    const supabase = await createClient();

    const { data: ordenes, error } = await supabase
      .from("ordenes")
      .select("*, cliente:clientes(*), orden_items(producto_id, cantidad)")
      .order("fecha_ingreso", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let ok = 0;
    let fail = 0;

    for (const orden of ordenes ?? []) {
      try {
        await actualizarOrdenSheet(orden as Record<string, unknown>);
        ok++;
      } catch {
        fail++;
      }
    }

    return NextResponse.json({ ok, fail, total: (ordenes ?? []).length });
  } catch (e) {
    console.error("Resync error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
