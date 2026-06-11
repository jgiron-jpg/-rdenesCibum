"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrdenForm } from "@/components/orders/orden-form";
import type { Cliente, Producto } from "@/types";
import { Loader2 } from "lucide-react";

export default function EditarOrdenPage() {
  const { id } = useParams();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: c }, { data: p }, { data: { user } }] = await Promise.all([
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("productos").select("*").eq("activo", true).order("marca"),
        supabase.auth.getUser(),
      ]);
      setClientes(c ?? []);
      setProductos(p ?? []);
      setUserEmail(user?.email ?? "");
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

  return (
    <OrdenForm
      clientes={clientes}
      productos={productos}
      userEmail={userEmail}
      ordenId={id as string}
    />
  );
}
