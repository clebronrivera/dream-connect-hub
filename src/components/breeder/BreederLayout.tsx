// Mobile-first layout chrome for /breeder/*. A header with a back affordance
// + a sign-out menu, then an Outlet for the page content.

import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBreederAuth } from "@/hooks/use-breeder-auth";

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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
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
          <h1 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Dream Puppies · Breeder
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
