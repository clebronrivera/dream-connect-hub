// /admin/settings/breeder-passcode
//
// Carlos sets or rotates the 4-digit pin Yolanda uses at /breeder/login.
// The pin is bcrypt-hashed server-side via the breeder-set-passcode edge
// function — never persisted client-side. After save, a QR code of the
// /breeder/login URL is rendered so Carlos can scan it onto Yolanda's
// phone and bookmark.

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, ShieldOff, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setBreederPasscode } from "@/lib/breeder/api";
import { supabase } from "@/lib/supabase";
import type { BreederSessionRow } from "@/types/breeder";

const SESSIONS_QK = ["breeder", "sessions"] as const;

async function fetchSessions(): Promise<BreederSessionRow[]> {
  const { data, error } = await supabase
    .from("breeder_sessions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BreederSessionRow[];
}

async function revokeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("breeder_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

function pinIsValid(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function sessionStatus(
  s: BreederSessionRow,
  now: number,
): { label: string; tone: "active" | "revoked" | "expired" } {
  if (s.revoked_at) return { label: "Revoked", tone: "revoked" };
  if (new Date(s.expires_at).getTime() < now)
    return { label: "Expired", tone: "expired" };
  return { label: "Active", tone: "active" };
}

export default function BreederPasscodeSettings() {
  const queryClient = useQueryClient();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showSavedState, setShowSavedState] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const breederLoginUrl = useMemo(() => {
    if (typeof window === "undefined") return "/breeder/login";
    return `${window.location.origin}/breeder/login`;
  }, []);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: SESSIONS_QK,
    queryFn: fetchSessions,
  });

  const saveMut = useMutation({
    mutationFn: (newPin: string) => setBreederPasscode(newPin),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Breeder passcode saved");
      setShowSavedState(true);
      setPin("");
      setConfirmPin("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMut = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QK });
      toast.success("Session revoked");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSave() {
    if (!pinIsValid(pin)) {
      toast.error("Pin must be 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("Pins don't match");
      return;
    }
    saveMut.mutate(pin);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(breederLoginUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  const activeCount = useMemo(
    () =>
      sessions.filter(
        (s) => !s.revoked_at && new Date(s.expires_at).getTime() > now,
      ).length,
    [sessions, now],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Breeder passcode</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the 4-digit pin Yolanda uses at <code>/breeder/login</code> on her
          phone. Pins are PBKDF2-hashed server-side before storage. Rotating
          the pin does not revoke existing sessions — they expire naturally
          at 30 days.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pin">New 4-digit pin</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                autoComplete="new-password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 font-mono tracking-widest"
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm</Label>
              <Input
                id="confirm"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="mt-1 font-mono tracking-widest"
              />
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={!pinIsValid(pin) || pin !== confirmPin || saveMut.isPending}
          >
            {saveMut.isPending ? "Saving…" : "Save passcode"}
          </Button>
        </CardContent>
      </Card>

      {showSavedState && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h2 className="text-lg font-semibold">Hand off to Yolanda</h2>
              <p className="text-sm text-muted-foreground">
                Scan this QR with Yolanda's phone, bookmark the page, then have
                her enter the new pin to mint a 30-day session.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="rounded-lg border bg-white p-4">
                <QRCodeSVG value={breederLoginUrl} size={180} level="M" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Login URL</Label>
                  <div className="mt-1 flex gap-2">
                    <Input value={breederLoginUrl} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={copyUrl} aria-label="Copy URL">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sessions last 30 days. After that Yolanda re-enters the pin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Active sessions</h2>
            <Badge variant="secondary">{activeCount} active</Badge>
          </div>
          {sessionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Once Yolanda logs in, her device appears here.
            </p>
          ) : (
            <ul className="divide-y">
              {sessions.map((s) => {
                const status = sessionStatus(s, now);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {s.device_label || "Unnamed device"}
                        </span>
                        <Badge
                          variant={
                            status.tone === "active"
                              ? "default"
                              : status.tone === "revoked"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {status.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          last used {formatRelative(s.last_used_at, now)}
                        </span>
                        <span>
                          expires{" "}
                          {new Date(s.expires_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    {status.tone === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeMut.mutate(s.id)}
                        disabled={revokeMut.isPending}
                      >
                        {revokeMut.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldOff className="h-4 w-4" />
                        )}
                        <span className="ml-2">Revoke</span>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
