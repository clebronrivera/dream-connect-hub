// Mobile-first layout chrome for /breeder/*. A sticky top header with a
// back / home affordance, a persistent bottom navigation bar (Litters →
// Puppies → Parents), and an Outlet for the page content.
//
// Bottom nav lets Yolanda jump between sections from any sub-page — no
// need to go Home first to reach the Puppies tab.

import { useNavigate, Outlet, useLocation, NavLink } from "react-router-dom";
import { ArrowLeft, LogOut, Users, PawPrint, Heart, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBreederAuth } from "@/hooks/use-breeder-auth";

const NAV_ITEMS = [
  { to: "/breeder",          label: "Home",    Icon: Home,     exact: true  },
  { to: "/breeder/litters",  label: "Litters", Icon: Heart,    exact: false },
  { to: "/breeder/puppies",  label: "Puppies", Icon: PawPrint, exact: false },
  { to: "/breeder/parents",  label: "Parents", Icon: Users,    exact: false },
] as const;

export function BreederLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useBreederAuth();

  const isHome = location.pathname === "/breeder" || location.pathname === "/breeder/";

  function handleSignOut() {
    signOut();
    navigate("/breeder/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Top header ── */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          {!isHome && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Dream Puppies · Breeder
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* ── Page content — extra bottom padding so nav bar never overlaps ── */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* ── Persistent bottom navigation ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-10 flex border-t bg-background/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map(({ to, label, Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-3 text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
            aria-label={label}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
