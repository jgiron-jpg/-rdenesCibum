"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrdenesClient } from "@/components/orders/ordenes-client";
import type { Orden, Cliente } from "@/types";
import { Loader2 } from "lucide-react";

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: o }, { data: c }] = await Promise.all([
        supabase
          .from("ordenes")
          .select("*, cliente:clientes(id, nombre, nit)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("clientes").select("*").order("nombre"),
      ]);
      setOrdenes((o as Orden[]) ?? []);
      setClientes(c ?? []);
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

  return <OrdenesClient ordenes={ordenes} clientes={clientes} />;
}
