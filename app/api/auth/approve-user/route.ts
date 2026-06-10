import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const appUrl = "https://ordenes-cibum.vercel.app";

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
    return new NextResponse(`
      <html><body style="font-family: Arial; text-align: center; padding: 50px;">
        <h2>Usuario no encontrado</h2>
        <p>Es posible que ya haya sido procesado.</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  if (action === "approve") {
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { ...user.user_metadata, status: "approved" },
    });

    return new NextResponse(`
      <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px; background: #f9f9f9;">
        <div style="max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #000;">✅ Usuario aprobado</h2>
          <p style="color: #666;">${user.email} ya puede acceder al sistema.</p>
          <a href="${appUrl}/dashboard" style="background: #000; color: #fff; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 20px;">
            Ir al dashboard
          </a>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });

  } else {
    await adminClient.auth.admin.deleteUser(userId);

    return new NextResponse(`
      <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px; background: #f9f9f9;">
        <div style="max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #ef4444;">❌ Solicitud rechazada</h2>
          <p style="color: #666;">La solicitud de ${user.email} fue rechazada y eliminada.</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }
}
