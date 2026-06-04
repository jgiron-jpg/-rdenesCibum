import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: ordenes } = await supabase
    .from("ordenes")
    .select(
      `
      *,
      cliente:clientes(*),
      orden_items(*, producto:productos(*))
    `
    )
    .order("created_at", { ascending: false });

  return <DashboardClient ordenes={ordenes ?? []} />;
}
