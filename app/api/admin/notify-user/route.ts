import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, nombre, action } = await request.json();
  const appUrl = "https://ordenes-cibum.vercel.app";

  if (action === "approve") {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cibum Órdenes <onboarding@resend.dev>",
        to: "sales.cibum@gmail.com",
        subject: "Usuario aprobado — Cibum",
        html: `<p>El usuario ${nombre} (${email}) fue aprobado.</p>`,
      }),
    });
  }

  return NextResponse.json({ success: true });
}
