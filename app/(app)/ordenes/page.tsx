import { createClient } from "@/lib/supabase/server";
import { OrdenesClient } from "@/components/orders/ordenes-client";

export const revalidate = 0;

export default async function OrdenesPage() {
  const supabase = await createClient();

  const [{ data: ordenes }, { data: clientes }] = await Promise.all([
    supabase
      .from("ordenes")
      .select("*, cliente:clientes(*), orden_items(*, producto:productos(*))")
      .order("created_at", { ascending: false }),
    supabase.from("clientes").select("*").order("nombre"),
  ]);

  return <OrdenesClient ordenes={ordenes ?? []} clientes={clientes ?? []} />;
}
