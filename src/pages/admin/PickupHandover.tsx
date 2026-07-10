// src/pages/admin/PickupHandover.tsx
// Wave H phase 2 (H4). Admin-facing tablet flow for the in-person pickup
// handover. Operator works through the form at the kennel, uploads two
// required photos, captures the buyer's canvas signature, confirms ID
// last-4 + state + expiration, and signs off. Submitting calls
// finalize-pickup-handover which flips status, transitions the puppy to
// Sold, and sends the welcome-home email.
//
// All writes are admin-only via RLS (admin_all_pickup_handovers and
// admin_all_pickup_evidence_objects).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Upload, Camera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

import { fetchAgreement } from '@/lib/admin/agreements-service';
import {
  fetchPickupHandover,
  upsertPickupHandover,
  uploadPickupPhoto,
  getPickupPhotoSignedUrl,
  finalizePickupHandover,
  type PickupPhotoKind,
} from '@/lib/admin/pickup-handover-service';
import type { PickupBuyerIdType, PickupHandover } from '@/types/pickup-handover';

const ID_TYPE_LABELS: Record<PickupBuyerIdType, string> = {
  drivers_license: "Driver's license",
  passport: 'Passport',
  state_id: 'State ID',
  other: 'Other',
};

export default function PickupHandoverPage() {
  const { agreementId } = useParams<{ agreementId: string }>();
  const queryClient = useQueryClient();

  const agreementQ = useQuery({
    queryKey: ['agreement', agreementId],
    queryFn: () => fetchAgreement(agreementId!),
    enabled: !!agreementId,
  });

  const handoverQ = useQuery({
    queryKey: ['pickup-handover', agreementId],
    queryFn: () => fetchPickupHandover(agreementId!),
    enabled: !!agreementId,
  });

  if (!agreementId) return <div className="p-6">Missing agreement id.</div>;
  if (agreementQ.isLoading || handoverQ.isLoading) {
    return <div className="p-6">Loading…</div>;
  }
  if (agreementQ.error || !agreementQ.data) {
    return <div className="p-6 text-destructive">Failed to load agreement.</div>;
  }

  const agreement = agreementQ.data;
  const existingHandover = handoverQ.data ?? null;
  const isVerified = existingHandover?.handover_status === 'in_person_verified';

  return (
    <div className="space-y-6 p-4 max-w-3xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/agreements">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to agreements
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Pickup Handover</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {agreement.agreement_number} &middot; {agreement.buyer_name} &middot;{' '}
                {agreement.puppy_name}
              </p>
            </div>
            {isVerified && (
              <Badge className="bg-leaf/15 text-ink border-leaf/30">
                In-person verified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Confirmed pickup date:{' '}
            <strong>{agreement.confirmed_pickup_date ?? agreement.proposed_pickup_date}</strong>
          </p>
        </CardContent>
      </Card>

      {isVerified ? (
        <VerifiedSummary handover={existingHandover!} />
      ) : (
        <PickupForm
          agreementId={agreementId}
          defaultPickupDate={
            agreement.confirmed_pickup_date ?? agreement.proposed_pickup_date
          }
          existing={existingHandover}
          onFinalized={() => {
            queryClient.invalidateQueries({ queryKey: ['pickup-handover', agreementId] });
            queryClient.invalidateQueries({ queryKey: ['agreements'] });
          }}
        />
      )}
    </div>
  );
}

// ── In-person form ─────────────────────────────────────────────────────

interface PickupFormProps {
  agreementId: string;
  defaultPickupDate: string;
  existing: PickupHandover | null;
  onFinalized: () => void;
}

function PickupForm({
  agreementId,
  defaultPickupDate,
  existing,
  onFinalized,
}: PickupFormProps) {
  const queryClient = useQueryClient();
  const buyerSigRef = useRef<SignatureCanvas>(null);

  const [pickupDate, setPickupDate] = useState(existing?.pickup_date ?? defaultPickupDate);
  const [idType, setIdType] = useState<PickupBuyerIdType | ''>(
    (existing?.buyer_id_type as PickupBuyerIdType | undefined) ?? ''
  );
  const [idLastFour, setIdLastFour] = useState(existing?.buyer_id_last_four ?? '');
  const [idStateOrCountry, setIdStateOrCountry] = useState(
    existing?.buyer_id_state_or_country ?? ''
  );
  const [idExpirationVerified, setIdExpirationVerified] = useState(
    !!existing?.buyer_id_expiration_verified
  );
  const [staffInitials, setStaffInitials] = useState(existing?.staff_member_initials ?? '');
  const [vetCertHandedOver, setVetCertHandedOver] = useState(
    !!existing?.vet_certificate_handed_over
  );
  const [healthAckSigned, setHealthAckSigned] = useState(
    !!existing?.health_acknowledgment_signed_at
  );
  const [reviewRequestMentioned, setReviewRequestMentioned] = useState(
    !!existing?.review_request_mentioned_at
  );

  const [puppyPhotoPath, setPuppyPhotoPath] = useState<string | null>(
    existing?.photo_buyer_with_puppy_path ?? null
  );
  const [idPhotoPath, setIdPhotoPath] = useState<string | null>(
    existing?.photo_buyer_with_id_path ?? null
  );
  const [locationPhotoPath, setLocationPhotoPath] = useState<string | null>(
    existing?.photo_pickup_location_path ?? null
  );

  // Re-paint the buyer signature canvas if a saved version exists.
  useEffect(() => {
    if (existing?.buyer_signature_canvas && buyerSigRef.current) {
      buyerSigRef.current.fromDataURL(existing.buyer_signature_canvas);
    }
  }, [existing?.buyer_signature_canvas]);

  // Photo upload mutation — uploads then UPSERTs the new path so the row
  // reflects state even before the operator clicks "Finalize".
  const photoMut = useMutation({
    mutationFn: async (vars: { kind: PickupPhotoKind; file: File }) => {
      const path = await uploadPickupPhoto(agreementId, vars.kind, vars.file);
      const patch: Partial<PickupHandover> = {
        agreement_id: agreementId,
        pickup_date: pickupDate,
      };
      if (vars.kind === 'buyer_with_puppy') patch.photo_buyer_with_puppy_path = path;
      if (vars.kind === 'buyer_with_id') patch.photo_buyer_with_id_path = path;
      if (vars.kind === 'pickup_location') patch.photo_pickup_location_path = path;
      await upsertPickupHandover(
        patch as Partial<PickupHandover> & { agreement_id: string; pickup_date: string }
      );
      return { kind: vars.kind, path };
    },
    onSuccess: ({ kind, path }) => {
      if (kind === 'buyer_with_puppy') setPuppyPhotoPath(path);
      if (kind === 'buyer_with_id') setIdPhotoPath(path);
      if (kind === 'pickup_location') setLocationPhotoPath(path);
      queryClient.invalidateQueries({ queryKey: ['pickup-handover', agreementId] });
      toast.success('Photo uploaded');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const finalizeMut = useMutation({
    mutationFn: async () => {
      // Defense-in-depth client validation. The edge function repeats these.
      if (!puppyPhotoPath) throw new Error('Upload the buyer-with-puppy photo first.');
      if (!idPhotoPath) throw new Error('Upload the buyer-with-ID photo first.');
      if (!idType) throw new Error('Select the buyer ID type.');
      if (!/^\d{4}$/.test(idLastFour)) throw new Error('ID last-4 must be exactly 4 digits.');
      if (!idStateOrCountry.trim()) throw new Error('Enter the ID issuing state or country.');
      if (!idExpirationVerified) throw new Error('Confirm ID expiration was verified.');
      if (!staffInitials.trim()) throw new Error('Enter staff initials.');
      if (!vetCertHandedOver) throw new Error('Confirm vet certificate was handed over.');
      if (!healthAckSigned) throw new Error('Confirm the buyer signed the health acknowledgment.');

      const sigCanvas = buyerSigRef.current;
      if (!sigCanvas || sigCanvas.isEmpty()) {
        throw new Error('Capture the buyer signature on the canvas.');
      }
      const buyerSignatureData = sigCanvas.toDataURL('image/png');

      const now = new Date().toISOString();
      // Persist the full row before invoking finalize.
      await upsertPickupHandover({
        agreement_id: agreementId,
        pickup_date: pickupDate,
        buyer_id_type: idType,
        buyer_id_last_four: idLastFour,
        buyer_id_state_or_country: idStateOrCountry.trim(),
        buyer_id_expiration_verified: true,
        buyer_signature_canvas: buyerSignatureData,
        buyer_signature_at: now,
        staff_member_initials: staffInitials.trim(),
        staff_signature_at: now,
        photo_buyer_with_puppy_path: puppyPhotoPath,
        photo_buyer_with_id_path: idPhotoPath,
        photo_pickup_location_path: locationPhotoPath,
        health_acknowledgment_signed_at: now,
        vet_certificate_handed_over: true,
        vet_certificate_acknowledged_at: now,
        review_request_mentioned_at: reviewRequestMentioned ? now : null,
      });

      return await finalizePickupHandover(agreementId);
    },
    onSuccess: (result) => {
      if (result.already_verified) {
        toast.info('Pickup was already finalized.');
      } else {
        toast.success('Pickup finalized — welcome-home email sent.');
      }
      onFinalized();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pickup details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="pickup-date" className="text-sm">Pickup date</Label>
            <Input
              id="pickup-date"
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <PhotoCard
        label="Buyer with puppy"
        helper="Required. Take or upload a photo of the buyer holding their puppy at handover."
        currentPath={puppyPhotoPath}
        onPick={(file) => photoMut.mutate({ kind: 'buyer_with_puppy', file })}
        pending={photoMut.isPending && photoMut.variables?.kind === 'buyer_with_puppy'}
      />
      <PhotoCard
        label="Buyer holding their ID"
        helper="Required. Buyer holds their photo ID next to their face — used to confirm identity."
        currentPath={idPhotoPath}
        onPick={(file) => photoMut.mutate({ kind: 'buyer_with_id', file })}
        pending={photoMut.isPending && photoMut.variables?.kind === 'buyer_with_id'}
      />
      <PhotoCard
        label="Pickup location (optional)"
        helper="Optional. A wide shot of the kennel or hand-off location helps establish context."
        currentPath={locationPhotoPath}
        onPick={(file) => photoMut.mutate({ kind: 'pickup_location', file })}
        pending={photoMut.isPending && photoMut.variables?.kind === 'pickup_location'}
        optional
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ID verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">ID type</Label>
              <Select
                value={idType}
                onValueChange={(v) => setIdType(v as PickupBuyerIdType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ID_TYPE_LABELS) as PickupBuyerIdType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ID_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="id-last-four" className="text-sm">ID last 4 digits</Label>
              <Input
                id="id-last-four"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                value={idLastFour}
                onChange={(e) => setIdLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="id-state" className="text-sm">Issuing state or country</Label>
            <Input
              id="id-state"
              value={idStateOrCountry}
              onChange={(e) => setIdStateOrCountry(e.target.value)}
              placeholder="FL, CA, MX, …"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="id-expiration-verified"
              checked={idExpirationVerified}
              onCheckedChange={(v) => setIdExpirationVerified(v === true)}
            />
            <Label htmlFor="id-expiration-verified" className="text-sm">
              I verified the ID is unexpired.
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            We never collect the full ID number — only last-4, state/country, and expiration confirmation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Buyer signature</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Hand the tablet to the buyer to sign below.
          </p>
          <div className="rounded border-2 border-dashed border-line bg-muted/40">
            <SignatureCanvas
              ref={buyerSigRef}
              penColor="#1a1a2e"
              canvasProps={{
                width: 500,
                height: 160,
                className: 'block',
                style: { touchAction: 'none', cursor: 'crosshair' },
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => buyerSigRef.current?.clear()}
          >
            Clear signature
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Acknowledgments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="health-ack"
              checked={healthAckSigned}
              onCheckedChange={(v) => setHealthAckSigned(v === true)}
            />
            <Label htmlFor="health-ack" className="text-sm leading-snug">
              Buyer signed the health acknowledgment confirming they accepted the puppy in
              apparent good health.
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="vet-cert"
              checked={vetCertHandedOver}
              onCheckedChange={(v) => setVetCertHandedOver(v === true)}
            />
            <Label htmlFor="vet-cert" className="text-sm leading-snug">
              Vet certificate / health record was handed to the buyer.
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="review-request"
              checked={reviewRequestMentioned}
              onCheckedChange={(v) => setReviewRequestMentioned(v === true)}
            />
            <Label htmlFor="review-request" className="text-sm leading-snug">
              Mentioned to the buyer that we'd appreciate a Google review (optional — the
              welcome-home email also includes a review link once one is configured).
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Staff sign-off</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="staff-initials" className="text-sm">Initials</Label>
          <Input
            id="staff-initials"
            value={staffInitials}
            onChange={(e) => setStaffInitials(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="LB"
            className="max-w-[8rem]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={() => finalizeMut.mutate()}
          disabled={finalizeMut.isPending}
        >
          {finalizeMut.isPending ? 'Finalizing…' : 'Finalize Pickup Handover'}
        </Button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function PhotoCard({
  label,
  helper,
  currentPath,
  onPick,
  pending,
  optional,
}: {
  label: string;
  helper: string;
  currentPath: string | null;
  onPick: (file: File) => void;
  pending: boolean;
  optional?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewQ = useQuery({
    queryKey: ['pickup-photo-url', currentPath],
    queryFn: () => getPickupPhotoSignedUrl(currentPath!),
    enabled: !!currentPath,
    staleTime: 30 * 60 * 1000, // signed URL is good for 1h; refresh after 30 min.
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {label}
          {optional && <Badge variant="outline" className="text-xs">Optional</Badge>}
          {currentPath && !optional && (
            <Badge className="bg-leaf/15 text-ink border-leaf/30 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{helper}</p>
        {previewQ.data && (
          <img
            src={previewQ.data}
            alt={label}
            className="rounded border max-h-48 object-contain"
          />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = '';
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {currentPath ? <Upload className="h-3 w-3 mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
            {pending ? 'Uploading…' : currentPath ? 'Replace photo' : 'Take or upload'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VerifiedSummary({ handover }: { handover: PickupHandover }) {
  const summary = useMemo(
    () => [
      { k: 'Pickup date', v: handover.pickup_date },
      { k: 'ID type', v: handover.buyer_id_type ? ID_TYPE_LABELS[handover.buyer_id_type as PickupBuyerIdType] : '—' },
      { k: 'ID last-4', v: handover.buyer_id_last_four ?? '—' },
      { k: 'ID issuing region', v: handover.buyer_id_state_or_country ?? '—' },
      { k: 'Staff initials', v: handover.staff_member_initials ?? '—' },
      { k: 'Verified at', v: handover.staff_signature_at ?? '—' },
    ],
    [handover]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Pickup record</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          {summary.map(({ k, v }) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
