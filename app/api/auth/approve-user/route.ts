import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");

  if (!userId || !action) {
    return new NextResponse("Parámetros inválidos", { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userData } = await adminClient.auth.admin.getUserById(userId);
  const user = userData?.user;

  if (!user) {
    return new NextResponse("Usuario no encontrado", { status: 404 });
  }

  if (action === "approve") {
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        status: "approved",
      },
    });

    // Notificar al usuario
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cibum Órdenes <onboarding@resend.dev>",
        to: user.email,
        subject: "Tu acceso fue aprobado — Cibum",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>¡Tu acceso fue aprobado! ✅</h2>
            <p>Hola ${user.user_metadata?.nombre ?? ""},</p>
            <p>Tu solicitud de acceso al sistema de órdenes de Cibum fue aprobada.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login"
               style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 20px 0;">
              Ingresar a la app
            </a>
            <p style="color: #999; font-size: 12px;">Cibum Guatemala</p>
          </div>
        `,
      }),
    });

    return new NextResponse(`
      <html><body style="font-family: Arial; text-align: center; padding: 50px;">
        <h2>✅ Usuario aprobado</h2>
        <p>${user.email} ya puede acceder al sistema.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Ir al dashboard</a>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });

  } else {
    await adminClient.auth.admin.deleteUser(userId);

    return new NextResponse(`
      <html><body style="font-family: Arial; text-align: center; padding: 50px;">
        <h2>❌ Usuario rechazado</h2>
        <p>La solicitud de ${user.email} fue rechazada y eliminada.</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }
}
