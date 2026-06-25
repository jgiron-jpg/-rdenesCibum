import { NextRequest, NextResponse } from "next/server";
import { agregarMovimientoErickaSheet } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  try {
    const { movimiento } = await req.json();
    if (!movimiento) return NextResponse.json({ error: "Falta movimiento" }, { status: 400 });
    await agregarMovimientoErickaSheet(movimiento);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Sheets movimiento sync error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
