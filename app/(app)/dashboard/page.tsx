"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { Orden } from "@/types";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data } = await supabase
        .from("ordenes")
        .select("*, cliente:clientes(id, nombre, nit)")
        .order("created_at", { ascending: false })
        .limit(500);
      setOrdenes((data as Orden[]) ?? []);
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

  return <DashboardClient ordenes={ordenes} />;
}
