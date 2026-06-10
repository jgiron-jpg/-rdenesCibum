import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, email, nombre, role } = await request.json();

    const appUrl = "https://ordenes-cibum.vercel.app";
    const approveUrl = `${appUrl}/api/auth/approve-user?userId=${userId}&action=approve`;
    const rejectUrl = `${appUrl}/api/auth/approve-user?userId=${userId}&action=reject`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cibum Órdenes <onboarding@resend.dev>",
        to: "jgiron@unis.edu.gt",
        subject: `Solicitud de acceso — ${nombre || email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #000;">Nueva solicitud de acceso</h2>
            <p>Un nuevo usuario quiere acceder al sistema de órdenes de Cibum:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; color: #666;">Nombre:</td><td style="padding: 8px; font-weight: bold;">${nombre}</td></tr>
              <tr><td style="padding: 8px; color: #666;">Email:</td><td style="padding: 8px;">${email}</td></tr>
              <tr><td style="padding: 8px; color: #666;">Área:</td><td style="padding: 8px;">${role}</td></tr>
            </table>
            <div style="margin: 30px 0;">
              <a href="${approveUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 12px;">
                ✅ Aprobar acceso
              </a>
              <a href="${rejectUrl}" style="background: #ef4444; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                ❌ Rechazar
              </a>
            </div>
            <p style="color: #999; font-size: 12px;">Cibum Guatemala — Sistema de Gestión de Órdenes</p>
          </div>
        `,
      }),
    });

    const resendData = await resendRes.json();
    console.log("Resend response:", resendData);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
