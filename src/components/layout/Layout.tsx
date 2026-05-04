import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAdmin, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
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
