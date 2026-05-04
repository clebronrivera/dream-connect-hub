import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Seo } from "@/components/seo/Seo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Seo pageId="notFound" canonicalPath={location.pathname} />
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="text-center text-white">
          <h1 className="mb-4 font-display text-5xl md:text-6xl">404</h1>
          <p className="mb-6 text-xl text-white/80">That page does not exist.</p>
          <a href="/" className="font-semibold text-accent underline underline-offset-4 hover:text-sun">
            Return home
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
