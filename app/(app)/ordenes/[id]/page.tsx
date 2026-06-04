import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrdenDetalle } from "@/components/orders/orden-detalle";

export const revalidate = 0;

export default async function OrdenPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: orden } = await supabase
    .from("ordenes")
    .select("*, cliente:clientes(*), orden_items(*, producto:productos(*))")
    .eq("id", params.id)
    .single();

  if (!orden) notFound();

  const { data: historial } = await supabase
    .from("orden_historial")
    .select("*")
    .eq("orden_id", params.id)
    .order("fecha", { ascending: false });

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  const role = (user?.user_metadata?.role ?? "comercial") as string;

  return (
    <OrdenDetalle
      orden={orden}
      historial={historial ?? []}
      userEmail={user?.email ?? ""}
      userRole={role}
    />
  );
}
