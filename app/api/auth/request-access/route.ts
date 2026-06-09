import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { userId, email, nombre, role } = await request.json();

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Marcar usuario como pendiente
  await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { nombre, role, status: "pending" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ordenes-cibum.vercel.app";
  const approveUrl = `${appUrl}/api/auth/approve-user?userId=${userId}&action=approve`;
  const rejectUrl = `${appUrl}/api/auth/approve-user?userId=${userId}&action=reject`;

  // Enviar email al admin via Resend
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cibum Órdenes <onboarding@resend.dev>",
      to: "ventas@cibumgt.com",
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
          <div style="margin: 30px 0; display: flex; gap: 12px;">
            <a href="${approveUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 12px;">
              ✅ Aprobar acceso
            </a>
            <a href="${rejectUrl}" style="background: #ef4444; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              ❌ Rechazar
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">Cibum Guatemala — Sistema de Gestión de Órdenes</p>
        </div>
      `,
    }),
  });

  return NextResponse.json({ success: true });
}
