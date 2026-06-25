import { createClient } from "@/lib/supabase/server";
import { OrdenForm } from "@/components/orders/orden-form";

export const revalidate = 0;

export default async function NuevaOrdenPage() {
  const supabase = await createClient();

  const [{ data: clientes }, { data: productos }, { data: userRes }] =
    await Promise.all([
      supabase.from("clientes").select("*").order("nombre"),
      supabase.from("productos").select("*").eq("activo", true).order("marca"),
      supabase.auth.getUser(),
    ]);

  const userEmail = userRes?.user?.email ?? "";
  const userNombre = userRes?.user?.user_metadata?.nombre ?? userEmail;

  return (
    <OrdenForm
      clientes={clientes ?? []}
      productos={productos ?? []}
      userEmail={userEmail}
      userNombre={userNombre}
    />
  );
}
