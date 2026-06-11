"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrdenForm } from "@/components/orders/orden-form";
import type { Cliente, Producto, Orden } from "@/types";
import { Loader2 } from "lucide-react";

export default function EditarOrdenPage() {
  const { id } = useParams();
  const [orden, setOrden] = useState<Orden | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: o }, { data: c }, { data: p }, { data: { user } }] = await Promise.all([
        supabase
          .from("ordenes")
          .select("*, orden_items(*)")
          .eq("id", id)
          .single(),
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("productos").select("*").eq("activo", true).order("marca"),
        supabase.auth.getUser(),
      ]);
      setOrden(o);
      setClientes(c ?? []);
      setProductos(p ?? []);
      setUserEmail(user?.email ?? "");
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

  if (!orden) {
    return (
      <div className="p-6 text-muted-foreground text-sm">
        No se encontró la orden.
      </div>
    );
  }

  return (
    <OrdenForm
      clientes={clientes}
      productos={productos}
      userEmail={userEmail}
      ordenExistente={orden}
    />
  );
}
