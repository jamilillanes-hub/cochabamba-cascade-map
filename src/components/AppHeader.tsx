import { Link, useRouterState } from "@tanstack/react-router";
import {
  Map,
  AlertTriangle,
  HeartHandshake,
  MessageSquare,
  ShieldAlert,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/", label: "Mapa 3D", icon: Map },
  { to: "/reportes", label: "Reportes", icon: AlertTriangle },
  { to: "/voluntariado", label: "Voluntariado", icon: HeartHandshake },
  { to: "/comunidad", label: "Comunidad", icon: MessageSquare },
  { to: "/emergencias", label: "24/7", icon: ShieldAlert },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile, isModerator, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-15 max-w-[1440px] items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/40 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="block font-display text-sm font-bold tracking-tight text-foreground">
              Comunidad Segura
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-primary">
              Cochabamba · Bolivia
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 rounded-full glass-pill px-3 py-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-risk-low" />
                <span className="max-w-[120px] truncate text-foreground">
                  {profile?.nombre_completo ?? user.email}
                </span>
                {isModerator && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    MOD
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => void signOut()} title="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">
                <User className="mr-1.5 h-3.5 w-3.5" />
                Ingresar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}