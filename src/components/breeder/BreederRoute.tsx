// Session gate for /breeder/*. Mirrors ProtectedRoute but checks the
// breeder localStorage session instead of Supabase auth.

import { Navigate, Outlet } from "react-router-dom";
import { useBreederAuth } from "@/hooks/use-breeder-auth";

export function BreederRoute() {
  const { session, loading } = useBreederAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/breeder/login" replace />;
  }

  return <Outlet />;
}
