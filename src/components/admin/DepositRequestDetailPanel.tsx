// Expandable admin detail panel for a single deposit request.
// Mirrors the structure of AgreementDetailPanel — contextual actions by status.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Check,
  X,
  Send,
  Mail,
  Copy,
  ExternalLink,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { DepositRequest } from "@/types/deposit-request";
import {
  acceptDepositRequest,
  declineDepositRequest,
  sendDepositLink,
  updateDepositRequestNotes,
} from "@/lib/admin/deposit-requests-service";

interface Props {
  request: DepositRequest;
}

export function DepositRequestDetailPanel({ request }: Props) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["deposit-requests"] });
    qc.invalidateQueries({ queryKey: ["deposit-requests-counts"] });
  };

  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [notes, setNotes] = useState(request.admin_notes ?? "");

  // Send-link state (email-only)
  const [customMessage, setCustomMessage] = useState("");

  const acceptMut = useMutation({
    mutationFn: () => acceptDepositRequest(request.id),
    onSuccess: () => {
      toast.success("Request accepted. You can now send the deposit link.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const declineMut = useMutation({
    mutationFn: () => declineDepositRequest(request.id, declineReason),
    onSuccess: () => {
      toast.success("Request declined.");
      setShowDecline(false);
      setDeclineReason("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMut = useMutation({
    mutationFn: () => sendDepositLink(request.id, customMessage || undefined),
    onSuccess: () => {
      toast.success("Deposit link emailed to customer.");
      setCustomMessage("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const notesMut = useMutation({
    mutationFn: () => updateDepositRequestNotes(request.id, notes),
    onSuccess: () => {
      toast.success("Notes saved.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = request.request_status;

  return (
    <div className="p-4 space-y-5 bg-gray-50/50">
      {/* Customer info */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Customer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Field label="Name" value={request.customer_name} />
          <Field
            label="Email"
            value={
              <a href={`mailto:${request.customer_email}`} className="text-blue-600 hover:underline">
                {request.customer_email}
              </a>
            }
          />
          <Field label="Phone" value={request.customer_phone ?? "—"} />
          <Field label="Location" value={[request.city, request.state].filter(Boolean).join(", ") || "—"} />
        </div>
      </section>

      {/* Dog / Litter info */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          {request.puppy_id ? "Puppy" : "Litter"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {request.puppy_name ? (
            <Field label="Puppy" value={request.puppy_name} />
          ) : (
            <>
              <Field label="Litter" value={request.upcoming_litter_label ?? "—"} />
              <Field label="Puppy slot" value={request.upcoming_puppy_placeholder_summary ?? "—"} />
            </>
          )}
          <Field label="Origin" value={request.origin === "admin_initiated" ? "Admin-initiated" : "Public form"} />
          <Field label="Submitted" value={new Date(request.created_at).toLocaleString()} />
        </div>
      </section>

      {/* Request details */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Request Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Field label="Preferred payment" value={request.preferred_payment_method ?? "—"} />
          <Field label="Proposed pickup" value={request.proposed_pickup_date ?? "—"} />
          <Field label="Spoke with" value={request.spoke_with ?? "No one yet"} />
          <Field
            label="How heard"
            value={
              request.how_heard
                ? request.how_heard_referral_name
                  ? `${request.how_heard} — ${request.how_heard_referral_name}`
                  : request.how_heard
                : "—"
            }
          />
        </div>
      </section>

      {/* Action section — contextual by status */}
      <section className="bg-white rounded-lg border p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase text-gray-500">Action</h3>

        {status === "pending" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Review this request. Accept to move to the send-link stage, or decline with a reason.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => acceptMut.mutate()}
                disabled={acceptMut.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" /> Accept Request
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDecline((v) => !v)}
                disabled={declineMut.isPending}
              >
                <X className="h-4 w-4 mr-1" /> Decline
              </Button>
            </div>
            {showDecline && (
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="decline-reason">Decline reason</Label>
                <Textarea
                  id="decline-reason"
                  placeholder="Explain why the request is being declined (shown internally, not emailed to the customer)..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => declineMut.mutate()}
                    disabled={!declineReason.trim() || declineMut.isPending}
                  >
                    Confirm Decline
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDecline(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {(status === "accepted" || status === "deposit_link_sent") && (
          <div className="space-y-3">
            {status === "deposit_link_sent" && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">Link already sent</p>
                    <p className="text-xs text-blue-700">
                      Sent {request.deposit_link_sent_at ? new Date(request.deposit_link_sent_at).toLocaleString() : ""}
                      {" "}via {request.deposit_link_sent_via?.join(" + ") ?? "—"}
                    </p>
                  </div>
                </div>
                {request.deposit_link_url && (
                  <div className="flex items-center gap-2 pt-1">
                    <code className="flex-1 text-xs bg-white border rounded px-2 py-1 truncate">
                      {request.deposit_link_url}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(request.deposit_link_url!);
                        toast.success("Link copied");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a href={request.deposit_link_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-gray-700">
              {status === "accepted"
                ? "Email the deposit agreement link to the customer."
                : "Resend the deposit agreement link if needed."}
            </p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Will be sent to <strong className="text-foreground">{request.customer_email}</strong></span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom-msg" className="text-xs">
                Custom message (optional, included in email)
              </Label>
              <Textarea
                id="custom-msg"
                placeholder="e.g. 'Congrats! We'd love to set aside the first pick for you...'"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              {sendMut.isPending ? "Sending..." : status === "deposit_link_sent" ? "Resend Email" : "Send Deposit Link"}
            </Button>
          </div>
        )}

        {status === "converted" && (
          <div className="space-y-2">
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm">
              <p className="font-medium text-green-900">Agreement submitted</p>
              <p className="text-xs text-green-700">
                {request.converted_at ? `Converted ${new Date(request.converted_at).toLocaleString()}` : ""}
              </p>
            </div>
            {request.deposit_agreement_id && (
              <Link to="/admin/agreements" className="inline-block">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" /> View Agreement
                </Button>
              </Link>
            )}
          </div>
        )}

        {status === "declined" && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm space-y-1">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Request declined</p>
                <p className="text-xs text-red-700 whitespace-pre-wrap">
                  {request.decline_reason ?? "No reason provided."}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Admin notes */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Admin notes</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes about this request..."
          rows={3}
        />
        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => notesMut.mutate()}
            disabled={notesMut.isPending || notes === (request.admin_notes ?? "")}
          >
            Save notes
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}
