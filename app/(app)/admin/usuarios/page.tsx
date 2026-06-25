"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Usuario {
  id: string;
  email: string;
  created_at: string;
  user_metadata: { nombre?: string; role?: string; status?: string };
}

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  produccion: { label: "Producción", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  comercial: { label: "Comercial", color: "text-green-400 bg-green-500/10 border-green-500/20" },
};

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [resyncing, setResyncing] = useState(false);

  async function resyncSheets() {
    setResyncing(true);
    setMensaje("");
    const res = await fetch("/api/sheets/resync-recientes", { method: "POST" });
    const data = await res.json();
    if (data.ok !== undefined) {
      setMensaje(`✅ Re-sync completo: ${data.ok} órdenes actualizadas${data.fail > 0 ? `, ${data.fail} fallaron` : ""}`);
    } else {
      setMensaje("❌ Error en re-sync: " + (data.error ?? "desconocido"));
    }
    setResyncing(false);
  }

  useEffect(() => { fetchUsuarios(); }, []);

  async function fetchUsuarios() {
    setLoading(true);
    const res = await fetch("/api/admin/list-users");
    const data = await res.json();
    if (data.users) setUsuarios(data.users);
    setLoading(false);
  }

  async function aprobar(userId: string, email: string, metadata: Record<string, string>) {
    setProcesando(userId);
    await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, metadata: { ...metadata, status: "approved" } }),
    });

    // Notificar al usuario
    await fetch("/api/admin/notify-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nombre: metadata.nombre, action: "approve" }),
    });

    setMensaje(`✅ ${email} aprobado`);
    fetchUsuarios();
    setProcesando(null);
  }

  async function rechazar(userId: string, email: string) {
    if (!confirm(`¿Rechazar y eliminar a ${email}?`)) return;
    setProcesando(userId);
    await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setMensaje(`❌ ${email} rechazado`);
    fetchUsuarios();
    setProcesando(null);
  }

  const pendientes = usuarios.filter(u => u.user_metadata?.status === "pending");
  const aprobados = usuarios.filter(u => u.user_metadata?.status !== "pending");

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Usuarios</h1>
          <p className="text-muted-foreground text-sm">Aprobá o rechazá solicitudes de acceso</p>
        </div>
        <button
          onClick={resyncSheets}
          disabled={resyncing}
          className="flex items-center gap-2 text-sm border border-border rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${resyncing ? "animate-spin" : ""}`} />
          {resyncing ? "Sincronizando..." : "Re-sync Sheets (últimas 100)"}
        </button>
      </div>

      {mensaje && (
        <div className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground">
          {mensaje}
        </div>
      )}

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-amber-500/5">
            <h3 className="text-sm font-semibold text-foreground">
              Solicitudes pendientes ({pendientes.length})
            </h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="divide-y divide-border">
              {pendientes.map(u => {
                const r = u.user_metadata?.role ?? "comercial";
                const cfg = roleConfig[r] ?? roleConfig.comercial;
                return (
                  <div key={u.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.user_metadata?.nombre ?? u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border mt-1 inline-block ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={procesando === u.id}
                        onClick={() => aprobar(u.id, u.email, u.user_metadata as Record<string, string>)}
                        className="flex items-center gap-1.5 bg-foreground text-background text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-80 disabled:opacity-50 transition-opacity"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                      <button
                        disabled={procesando === u.id}
                        onClick={() => rechazar(u.id, u.email)}
                        className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {pendientes.length === 0 && !loading && (
        <div className="bg-card border border-border rounded-xl px-5 py-8 text-center text-muted-foreground text-sm">
          No hay solicitudes pendientes
        </div>
      )}

      {/* Usuarios aprobados */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Usuarios activos ({aprobados.length})</h3>
        </div>
        <div className="divide-y divide-border">
          {aprobados.map(u => {
            const r = u.user_metadata?.role ?? "comercial";
            const cfg = roleConfig[r] ?? roleConfig.comercial;
            return (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-foreground">{u.user_metadata?.nombre ?? u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
