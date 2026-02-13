import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ConsultationRequest, IntakePayload } from '@/lib/supabase';

const CONSULTATION_TYPE_LABELS: Record<string, string> = {
  starter: 'Puppy Starter',
  readiness: 'Ready for a Puppy?',
  behavior: 'Behavior Consultation',
};

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  const v = value == null || value === '' ? '—' : String(value);
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{v}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground border-b pb-1">{title}</h3>
      <dl className="grid gap-2">{children}</dl>
    </div>
  );
}

function IntakeSection({ payload, type }: { payload?: IntakePayload | null; type?: string }) {
  if (!payload || typeof payload !== 'object') return null;

  const t = type || 'starter';

  if (t === 'starter') {
    const p = payload as { help_topics?: string[]; notes?: string };
    return (
      <Section title="Starter intake answers">
        {p.help_topics?.length ? (
          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Help topics</dt>
            <dd className="text-sm text-foreground">
              <ul className="list-disc list-inside">{p.help_topics.map((topic, i) => <li key={i}>{topic}</li>)}</ul>
            </dd>
          </div>
        ) : null}
        <Field label="Additional notes" value={p.notes} />
      </Section>
    );
  }

  if (t === 'readiness') {
    const p = payload as {
      why_now?: string;
      primary_caregiver?: string;
      weekday_schedule?: string;
      budget_upfront?: string;
      budget_monthly?: string;
      preferred_breed_size?: string;
      other_pets_kids?: string;
    };
    return (
      <Section title="Readiness intake answers">
        <Field label="Why considering a puppy now?" value={p.why_now} />
        <Field label="Primary caregiver" value={p.primary_caregiver} />
        <Field label="Typical weekday schedule" value={p.weekday_schedule} />
        <Field label="Budget (upfront)" value={p.budget_upfront} />
        <Field label="Budget (monthly)" value={p.budget_monthly} />
        <Field label="Preferred breed/size and why" value={p.preferred_breed_size} />
        <Field label="Other pets or young children?" value={p.other_pets_kids} />
      </Section>
    );
  }

  if (t === 'behavior') {
    const p = payload as {
      primary_issue?: string;
      secondary_issue?: string;
      issues_checklist?: string[];
      context_notes?: string;
    };
    return (
      <Section title="Behavior intake answers">
        <Field label="Primary issue" value={p.primary_issue} />
        <Field label="Secondary issue" value={p.secondary_issue} />
        {p.issues_checklist?.length ? (
          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Other concerns</dt>
            <dd className="text-sm text-foreground">
              <ul className="list-disc list-inside">{p.issues_checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </dd>
          </div>
        ) : null}
        <Field label="Context or notes" value={p.context_notes} />
      </Section>
    );
  }

  return null;
}

interface ConsultationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ConsultationRequest | null;
}

export function ConsultationDetailDialog({ open, onOpenChange, request }: ConsultationDetailDialogProps) {
  if (!request) return null;

  const date = request.created_at ? new Date(request.created_at).toLocaleString() : '—';
  const typeLabel = request.consultation_type ? CONSULTATION_TYPE_LABELS[request.consultation_type] || request.consultation_type : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consultation request</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Section title="Overview">
            <Field label="Date submitted" value={date} />
            <Field label="Type" value={typeLabel} />
            <Field label="Status" value={request.status ?? '—'} />
          </Section>

          <Section title="Contact">
            <Field label="Name" value={request.name} />
            <Field label="Email" value={request.email} />
            <Field label="Phone" value={request.phone} />
            <Field label="Preferred contact" value={request.preferred_contact} />
          </Section>

          {(request.pet_name || request.pet_type || request.breed || request.age) && (
            <Section title="Pet">
              <Field label="Pet name" value={request.pet_name} />
              <Field label="Pet type" value={request.pet_type} />
              <Field label="Breed" value={request.breed} />
              <Field label="Age" value={request.age} />
            </Section>
          )}

          {request.consultation_type === 'starter' && (
            <Section title="Puppy Heaven purchase">
              <Field
                label="Purchased from Puppy Heaven?"
                value={request.purchased_from_puppy_heaven == null ? undefined : request.purchased_from_puppy_heaven ? 'Yes' : 'No'}
              />
              {request.purchased_from_puppy_heaven && (
                <>
                  <Field label="Purchase date (approx)" value={request.purchase_date_approx} />
                  <Field label="Puppy name at purchase" value={request.puppy_name_at_purchase} />
                  <Field label="Breed at purchase" value={request.breed_at_purchase} />
                  <Field label="Phone at purchase" value={request.phone_at_purchase} />
                </>
              )}
            </Section>
          )}

          <IntakeSection payload={request.intake_payload} type={request.consultation_type} />

          {request.admin_notes && (
            <Section title="Admin notes">
              <p className="text-sm text-foreground whitespace-pre-wrap">{request.admin_notes}</p>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
