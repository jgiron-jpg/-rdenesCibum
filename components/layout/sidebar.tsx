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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { CibumLogo } from "@/components/ui/cibum-logo";
import { useTheme } from "@/components/ui/theme-provider";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/ordenes", icon: ClipboardList, label: "Órdenes" },
  { href: "/reportes", icon: BarChart3, label: "Reportes" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-card border-r border-border h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <CibumLogo className="w-10 h-10" />
        <div>
          <p className="text-sm font-bold">Cibum</p>
          <p className="text-xs text-muted-foreground">Gestión de Órdenes</p>
        </div>
      </div>

      {/* Quick action */}
      <div className="px-4 py-4">
        <Link
          href="/ordenes/nueva"
          className="flex items-center gap-2 w-full bg-foreground hover:opacity-80 text-background text-sm font-semibold rounded-lg px-3 py-2.5 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
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
    </aside>
  );
}
