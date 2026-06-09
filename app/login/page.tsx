"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Sun, Moon } from "lucide-react";
import { CibumLogo } from "@/components/ui/cibum-logo";
import { useTheme } from "@/components/ui/theme-provider";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("comercial");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenciales incorrectas. Verificá tu email y contraseña.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, role: rol, status: "pending" } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      // Enviar solicitud de aprobación al admin
      await fetch("/api/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          email,
          nombre,
          role: rol,
        }),
      });
      setSuccess("✅ Solicitud enviada. El administrador recibirá un email para aprobar tu acceso.");
      setModo("login");
      setPassword("");
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CibumLogo className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cibum</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestión de Órdenes</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8">
          {/* Tabs */}
          <div className="flex bg-background rounded-lg p-1 mb-6 border border-border">
            <button
              onClick={() => { setModo("login"); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                modo === "login" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setModo("registro"); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                modo === "registro" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Login */}
          {modo === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 text-sm text-green-600 dark:text-green-400">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Correo electrónico</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="usuario@cibum.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-foreground hover:opacity-80 disabled:opacity-50 text-background font-semibold rounded-lg py-2.5 text-sm transition-opacity flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</> : "Ingresar"}
              </button>
            </form>
          )}

          {/* Registro */}
          {modo === "registro" && (
            <form onSubmit={handleRegistro} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nombre completo</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required className={inputClass} placeholder="Ej: María García" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Correo electrónico</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="usuario@cibum.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputClass} placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Área</label>
                <select value={rol} onChange={(e) => setRol(e.target.value)} className={inputClass}>
                  <option value="comercial">Comercial</option>
                  <option value="produccion">Producción</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-foreground hover:opacity-80 disabled:opacity-50 text-background font-semibold rounded-lg py-2.5 text-sm transition-opacity flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creando cuenta...</> : "Crear cuenta"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Cibum Guatemala · Mr.Beef · Jack Links · Jerky Dealers
        </p>
      </div>
    </div>
  );
}
