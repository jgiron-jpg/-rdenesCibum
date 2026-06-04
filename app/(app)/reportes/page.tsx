import { createClient } from "@/lib/supabase/server";
import { ReportesClient } from "@/components/reportes/reportes-client";

export const revalidate = 0;

export default async function ReportesPage() {
  const supabase = await createClient();

  const { data: ordenes } = await supabase
    .from("ordenes")
    .select("*, cliente:clientes(*), orden_items(*)")
    .order("created_at", { ascending: false });

  return <ReportesClient ordenes={ordenes ?? []} />;
}
