// src/components/admin/OperatorReviewForm.tsx
// Wave C: structured operator review form.
//
// Replaces the old inline "Accept Request" button. Lets the operator pick a
// puppy from the request's litter, set the puppy's purchase price + deposit
// override, and (optionally) email the deposit link in the same submit.
//
// On submit:
//   1) Update the puppy row with base_price + deposit_amount.
//   2) Update the request — assign puppy_id + name snapshot, transition to
//      request_status='accepted'.
//   3) If "Save & Send" was chosen, fire send-deposit-link with the operator's
//      optional note as the email's customMessage (request → 'deposit_link_sent').
//
// "Save Only" leaves the request at 'accepted' so the operator can send later
// from the existing 'accepted'/'deposit_link_sent' branch of the detail panel.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  acceptWithPuppyAssignment,
  fetchPuppiesForLitter,
  sendDepositLink,
  type PuppyForReview,
} from "@/lib/admin/deposit-requests-service";
import { DEFAULT_DEPOSIT_AMOUNT } from "@/lib/constants/deposit";
import type { DepositRequest } from "@/types/deposit-request";

interface Props {
  request: DepositRequest;
  onClose: () => void;
}

export function OperatorReviewForm({ request, onClose }: Props) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["deposit-requests"] });
    qc.invalidateQueries({ queryKey: ["deposit-requests-counts"] });
  };

  const [puppyId, setPuppyId] = useState<string>(request.puppy_id ?? "");
  const [basePrice, setBasePrice] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>(String(DEFAULT_DEPOSIT_AMOUNT));
  const [notesToBuyer, setNotesToBuyer] = useState<string>("");

  const litterId = request.upcoming_litter_id;

  const {
    data: puppies = [],
    isLoading: puppiesLoading,
    isError: puppiesError,
  } = useQuery({
    queryKey: ["puppies-for-litter", litterId],
    queryFn: () => fetchPuppiesForLitter(litterId!),
    enabled: !!litterId,
  });

  /** Pre-fill price/deposit from the chosen puppy so the operator sees its
   * current values and can decide whether to override. */
  function handlePuppySelect(id: string) {
    setPuppyId(id);
    const p = puppies.find((pp) => pp.id === id);
    if (!p) return;
    const price = p.final_price ?? p.base_price ?? 0;
    const dep = p.deposit_amount ?? DEFAULT_DEPOSIT_AMOUNT;
    setBasePrice(price > 0 ? String(price) : "");
    setDepositAmount(String(dep));
  }

  async function doSubmit(sendNow: boolean) {
    const price = Number(basePrice);
    const dep = Number(depositAmount);
    if (!puppyId) throw new Error("Pick a puppy first.");
    if (!(price > 0)) throw new Error("Purchase price must be greater than zero.");
    if (!(dep > 0)) throw new Error("Deposit amount must be greater than zero.");

    await acceptWithPuppyAssignment({
      requestId: request.id,
      puppyId,
      basePrice: price,
      depositAmount: dep,
    });

    if (sendNow) {
      await sendDepositLink(request.id, notesToBuyer.trim() || undefined);
    }
  }

  const saveAndSendMut = useMutation({
    mutationFn: () => doSubmit(true),
    onSuccess: () => {
      toast.success("Reviewed, accepted, and emailed deposit link.");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveOnlyMut = useMutation({
    mutationFn: () => doSubmit(false),
    onSuccess: () => {
      toast.success("Reviewed and accepted. Send the deposit link when ready.");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitting = saveAndSendMut.isPending || saveOnlyMut.isPending;
  const canSubmit =
    !!puppyId && Number(basePrice) > 0 && Number(depositAmount) > 0 && !submitting;

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div>
        <h4 className="text-sm font-semibold">Review this request</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Pick the puppy you'll reserve for this buyer, then set the puppy's price and deposit.
          The puppy row stores the override; the request transitions to <strong>accepted</strong>.
          You can email the deposit link as part of the same submit.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="puppy-select">Puppy</Label>
        {!litterId ? (
          <p className="text-sm text-ink">
            This request has no upcoming-litter context — assign by hand or decline.
          </p>
        ) : puppiesLoading ? (
          <p className="text-sm text-muted-foreground">Loading puppies for this litter…</p>
        ) : puppiesError ? (
          <p className="text-sm text-red-600">Couldn't load puppies. Try again.</p>
        ) : puppies.length === 0 ? (
          <div className="rounded-md border border-sun/30 bg-sun/15 p-3 text-sm">
            <p className="font-medium text-ink">No puppies on this litter yet</p>
            <p className="text-xs text-ink mt-0.5">
              Create one in the puppies admin first, then return to this form.
            </p>
            <a
              href={`/admin/puppies/new?litter=${litterId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primaryDeep hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Create puppy
            </a>
          </div>
        ) : (
          <select
            id="puppy-select"
            value={puppyId}
            onChange={(e) => handlePuppySelect(e.target.value)}
            className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm"
            disabled={submitting}
          >
            <option value="">— Select a puppy —</option>
            {puppies.map((p) => (
              <option key={p.id} value={p.id}>
                {puppySummary(p)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="base-price">Purchase price ($)</Label>
          <Input
            id="base-price"
            type="number"
            min={1}
            step="0.01"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="2500"
            disabled={submitting}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="deposit-amount">Deposit ($)</Label>
          <Input
            id="deposit-amount"
            type="number"
            min={1}
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder={String(DEFAULT_DEPOSIT_AMOUNT)}
            disabled={submitting}
          />
          <p className="text-[10px] text-muted-foreground">
            Default ${DEFAULT_DEPOSIT_AMOUNT}. Override per puppy if needed.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes-to-buyer" className="text-xs">
          Note to buyer (optional, included in the deposit-link email)
        </Label>
        <Textarea
          id="notes-to-buyer"
          rows={2}
          placeholder="e.g. 'Congrats! We've set aside the cream-female for you.'"
          value={notesToBuyer}
          onChange={(e) => setNotesToBuyer(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          onClick={() => saveAndSendMut.mutate()}
          disabled={!canSubmit}
          className="bg-primaryDeep hover:bg-primary"
        >
          <Send className="h-4 w-4 mr-1" />
          {saveAndSendMut.isPending ? "Saving…" : "Save & Send Deposit Link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => saveOnlyMut.mutate()}
          disabled={!canSubmit}
        >
          <Save className="h-4 w-4 mr-1" />
          {saveOnlyMut.isPending ? "Saving…" : "Save Only"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function puppySummary(p: PuppyForReview): string {
  const name = p.name?.trim() || "(no name)";
  const breed = p.breed ? ` · ${p.breed}` : "";
  const gender = p.gender ? ` · ${p.gender}` : "";
  const status = p.status ? ` · ${p.status}` : "";
  return `${name}${breed}${gender}${status}`;
}
