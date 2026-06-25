import { NextRequest, NextResponse } from "next/server";
import { agregarOrdenSheet, actualizarOrdenSheet } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  try {
    const { orden, accion } = await req.json();
    if (!orden) return NextResponse.json({ error: "Falta orden" }, { status: 400 });

    if (accion === "crear") {
      await agregarOrdenSheet(orden);
    } else {
      await actualizarOrdenSheet(orden);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Sheets sync error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
