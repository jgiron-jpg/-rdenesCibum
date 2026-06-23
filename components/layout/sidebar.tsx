"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  LogOut,
  Plus,
  Sun,
  Moon,
  Menu,
  X,
  Users,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { CibumLogo } from "@/components/ui/cibum-logo";
import { useTheme } from "@/components/ui/theme-provider";
import { Notificaciones } from "@/components/layout/notificaciones";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/ordenes", icon: ClipboardList, label: "Órdenes" },
  { href: "/reportes", icon: BarChart3, label: "Reportes" },
  { href: "/actividad", icon: Activity, label: "Actividad" },
  { href: "/admin/usuarios", icon: Users, label: "Usuarios" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.user_metadata?.role === "admin");
    });
  }, []);

  const items = navItems;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const NavContent = () => (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <CibumLogo className="w-10 h-10" />
        <div className="flex-1">
          <p className="text-sm font-bold">Cibum</p>
          <p className="text-xs text-muted-foreground">Gestión de Órdenes</p>
        </div>
        <div className="hidden md:block">
          <Notificaciones align="left" />
        </div>
      </div>

      {/* Quick action */}
      <div className="px-4 py-4">
        <Link
          href="/ordenes/nueva"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 w-full bg-foreground hover:opacity-80 text-background text-sm font-semibold rounded-lg px-3 py-2.5 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-1">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <CibumLogo className="w-8 h-8" />
          <span className="text-sm font-bold">Cibum</span>
        </div>
        <div className="flex items-center gap-1">
          <Notificaciones />
          <button onClick={() => setOpen(!open)} className="p-2 text-muted-foreground hover:text-foreground">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <NavContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-card border-r border-border h-screen sticky top-0">
        <NavContent />
      </aside>
    </>
  );
}
