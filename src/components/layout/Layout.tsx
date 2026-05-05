import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GalacticHomeNav } from "@/components/home/GalacticHomeNav";
import { GalacticHomeMiniFooter } from "@/components/home/GalacticHomeMiniFooter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  /** When true, omit global nav + Footer (page provides its own chrome). */
  bare?: boolean;
}

export function Layout({ children, bare = false }: LayoutProps) {
  const { isAdmin, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {!bare && <GalacticHomeNav />}
      <main className={cn("flex-1", bare && "flex flex-col")}>{children}</main>
      {!bare && <GalacticHomeMiniFooter />}
      {!loading && isAdmin && (
        <Link
          to="/admin"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-pill bg-primaryDeep px-4 py-2.5 text-sm font-medium text-white shadow-sticker hover:opacity-90 transition-opacity"
          aria-label="Return to Admin Dashboard"
        >
          <LayoutDashboard className="h-4 w-4" />
          Return to Admin
        </Link>
      )}
    </div>
  );
}
