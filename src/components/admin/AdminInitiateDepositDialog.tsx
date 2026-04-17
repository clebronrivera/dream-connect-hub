// Admin-side dialog: create a deposit request on behalf of a customer
// and optionally send the deposit link in the same action.

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@/data/statesData";
import { Mail, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  fetchActiveUpcomingLitters,
  UPCOMING_LITTERS_ACTIVE_QUERY_KEY,
} from "@/lib/upcoming-litters";
import {
  createAdminInitiatedRequest,
  sendDepositLink,
} from "@/lib/admin/deposit-requests-service";
import { isValidUsPhone } from "@/lib/deposit-requests";
import type { UpcomingLitter } from "@/lib/supabase";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getLitterLabel(litter: UpcomingLitter): string {
  const breed = (litter.display_breed || litter.breed || "Upcoming Litter").trim();
  return litter.due_label ? `${breed}, ${litter.due_label}` : breed;
}

export function AdminInitiateDepositDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const { data: litters = [], isLoading: littersLoading } = useQuery({
    queryKey: UPCOMING_LITTERS_ACTIVE_QUERY_KEY,
    queryFn: fetchActiveUpcomingLitters,
    enabled: open,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [litterId, setLitterId] = useState<string>("");
  const [placeholderId, setPlaceholderId] = useState<string>("__none__");
  const [sendNow, setSendNow] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const selectedLitter = useMemo(
    () => litters.find((l) => l.id === litterId) ?? null,
    [litters, litterId]
  );
  const placeholders = selectedLitter?.puppy_placeholders ?? [];
  const selectedPlaceholder = useMemo(
    () =>
      placeholderId !== "__none__"
        ? placeholders.find((p) => p.id === placeholderId)
        : null,
    [placeholders, placeholderId]
  );

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setCity("");
      setState("");
      setLitterId("");
      setPlaceholderId("__none__");
      setSendNow(true);
      setCustomMessage("");
      setPhoneError(null);
    }
  }, [open]);

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!selectedLitter || !selectedLitter.id) {
        throw new Error("Please select a litter");
      }
      const placeholderSummary = selectedPlaceholder
        ? `${selectedPlaceholder.offspring_breed_label} (${selectedPlaceholder.lifecycle_status})`
        : null;

      const created = await createAdminInitiatedRequest({
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        upcoming_litter_id: selectedLitter.id,
        upcoming_litter_label: getLitterLabel(selectedLitter),
        upcoming_puppy_placeholder_id: selectedPlaceholder?.id ?? null,
        upcoming_puppy_placeholder_summary: placeholderSummary,
      });

      if (sendNow) {
        await sendDepositLink(created.id, customMessage || undefined);
      }
      return created;
    },
    onSuccess: () => {
      toast.success(
        sendNow
          ? "Request created and deposit link sent."
          : "Request created (status: accepted)."
      );
      qc.invalidateQueries({ queryKey: ["deposit-requests"] });
      qc.invalidateQueries({ queryKey: ["deposit-requests-counts"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    if (!isValidUsPhone(phone)) {
      setPhoneError("Please enter a valid US phone number (10 digits).");
      return;
    }
    submitMut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Deposit Request</DialogTitle>
          <DialogDescription>
            Create a deposit request on behalf of a customer. Optionally send the
            deposit agreement link via email and/or SMS in one step.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ai-name">Customer name *</Label>
              <Input
                id="ai-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ai-email">Email *</Label>
              <Input
                id="ai-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ai-phone">Phone *</Label>
            <Input
              id="ai-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              placeholder="(555) 123-4567"
              aria-invalid={!!phoneError}
            />
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ai-city">City</Label>
              <Input id="ai-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ai-state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="ai-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Upcoming litter *</Label>
            {littersLoading ? (
              <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading litters...
              </div>
            ) : (
              <Select value={litterId} onValueChange={setLitterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a litter" />
                </SelectTrigger>
                <SelectContent>
                  {litters.map((l) => (
                    <SelectItem key={l.id!} value={l.id!}>
                      {getLitterLabel(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedLitter && placeholders.length > 0 && (
            <div className="space-y-1">
              <Label>Puppy slot (optional)</Label>
              <Select value={placeholderId} onValueChange={setPlaceholderId}>
                <SelectTrigger>
                  <SelectValue placeholder="No specific slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific slot — entire litter</SelectItem>
                  {placeholders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.offspring_breed_label} ({p.lifecycle_status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={sendNow}
                onCheckedChange={(c) => setSendNow(c === true)}
              />
              Send deposit link immediately
            </label>

            {sendNow && (
              <div className="space-y-3 pl-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Deposit link will be emailed to the customer</span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-msg" className="text-xs">
                    Custom message (optional, included in email)
                  </Label>
                  <Textarea
                    id="ai-msg"
                    placeholder="e.g. 'Confirming our phone conversation — here's your deposit link...'"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitMut.isPending || !litterId}>
              {submitMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...
                </>
              ) : sendNow ? (
                <>
                  <Send className="h-4 w-4 mr-1" /> Create & Send Link
                </>
              ) : (
                "Create Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
