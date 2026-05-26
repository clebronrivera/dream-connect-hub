// src/pages/AgreementDownload.tsx — Wave F6
//
// Public buyer-facing page at /agreements/:agreementId/:buyerToken/download
//
// On mount, calls the agreement-download-url edge function with the buyer token.
// On success, immediately redirects the browser to the fresh 1-hour signed URL
// (forces a direct browser download rather than an in-page PDF viewer).
//
// Error states: not found, token expired, PDF not yet available.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";
import { useNoIndex } from "@/components/seo/Seo";

type State =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; message: string; canRetry: boolean };

export default function AgreementDownload() {
  useNoIndex();
  const { agreementId, buyerToken } = useParams<{
    agreementId: string;
    buyerToken: string;
  }>();
  const businessInfo = useBusinessInfoOrDefaults();

  // Lazy initializer — if the URL params are missing on mount, start in
  // the error state instead of dispatching setState from an effect.
  const [state, setState] = useState<State>(() =>
    agreementId && buyerToken
      ? { status: "loading" }
      : { status: "error", message: "Invalid download link.", canRetry: false },
  );

  const fetchAndRedirect = async () => {
    setState({ status: "loading" });

    try {
      const { data, error } = await supabase.functions.invoke(
        "agreement-download-url",
        {
          body: {
            agreement_id: agreementId,
            buyer_access_token: buyerToken,
          },
        }
      );

      if (error || !data?.download_url) {
        const msg =
          data?.error ??
          error?.message ??
          "Unable to generate a download link. Please try again.";
        const isExpired =
          typeof msg === "string" &&
          (msg.toLowerCase().includes("expired") ||
            msg.toLowerCase().includes("token"));
        setState({
          status: "error",
          message: isExpired
            ? "This download link has expired. Please contact us to receive a new link."
            : msg,
          canRetry: !isExpired,
        });
        return;
      }

      setState({ status: "redirecting" });
      // Redirect the browser tab to the signed URL — triggers native download dialog
      window.location.href = data.download_url;
    } catch (err) {
      setState({
        status: "error",
        message: (err as Error).message ?? "Unexpected error. Please try again.",
        canRetry: true,
      });
    }
  };

  useEffect(() => {
    if (agreementId && buyerToken) {
      // fetchAndRedirect is async and only writes state after the
      // network call resolves — the canonical fetch-on-mount pattern.
      // The set-state-in-effect rule can't see through the async
      // boundary; the rule is suppressed for this specific line.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAndRedirect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId, buyerToken]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-5">
        {state.status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">
              Preparing your download…
            </p>
          </>
        )}

        {state.status === "redirecting" && (
          <>
            <FileDown className="h-10 w-10 text-leaf mx-auto" />
            <p className="font-semibold text-ink">Download starting…</p>
            <p className="text-muted-foreground text-sm">
              If the download does not start automatically, your browser may
              have blocked the redirect. Click the button below.
            </p>
          </>
        )}

        {state.status === "error" && (
          <>
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-semibold text-ink">Download unavailable</p>
            <p className="text-muted-foreground text-sm">{state.message}</p>

            <div className="flex flex-col gap-3">
              {state.canRetry && (
                <Button onClick={fetchAndRedirect} variant="default">
                  Try again
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <a
                  href={`tel:+1${businessInfo.phoneRaw}`}
                  className="underline hover:text-primary"
                >
                  Call us at {businessInfo.phone}
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
