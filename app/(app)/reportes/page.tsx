"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReportesClient } from "@/components/reportes/reportes-client";
import type { Orden } from "@/types";
import { Loader2 } from "lucide-react";

export default function ReportesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data } = await supabase
        .from("ordenes")
        .select("*, cliente:clientes(*), orden_items(*)")
        .order("created_at", { ascending: false });
      setOrdenes(data ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ReportesClient ordenes={ordenes} />;
}
