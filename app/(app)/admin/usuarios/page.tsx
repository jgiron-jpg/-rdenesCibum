import { createClient } from "@/lib/supabase/server";
import { UsuariosClient } from "@/components/admin/usuarios-client";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const role = user?.user_metadata?.role;
  if (role !== "admin") redirect("/dashboard");

  return <UsuariosClient />;
}
