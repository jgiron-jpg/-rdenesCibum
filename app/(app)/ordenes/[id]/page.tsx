"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrdenDetalle } from "@/components/orders/orden-detalle";
import type { Orden, OrdenHistorial } from "@/types";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";

export default function OrdenPage() {
  const { id } = useParams();
  const [orden, setOrden] = useState<Orden | null>(null);
  const [historial, setHistorial] = useState<OrdenHistorial[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("comercial");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: o }, { data: h }, { data: { user } }] = await Promise.all([
        supabase
          .from("ordenes")
          .select("*, cliente:clientes(*), orden_items(*, producto:productos(*))")
          .eq("id", id)
          .single(),
        supabase
          .from("orden_historial")
          .select("*")
          .eq("orden_id", id)
          .order("fecha", { ascending: false }),
        supabase.auth.getUser(),
      ]);

      setOrden(o);
      setHistorial(h ?? []);
      setUserEmail(user?.email ?? "");
      setUserRole(user?.user_metadata?.role ?? "comercial");
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orden) { notFound(); return null; }

  return (
    <OrdenDetalle
      orden={orden}
      historial={historial}
      userEmail={userEmail}
      userRole={userRole}
    />
  );
}
