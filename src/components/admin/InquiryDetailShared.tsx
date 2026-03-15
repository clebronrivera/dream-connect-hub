/**
 * Shared UI for admin inquiry detail dialogs (puppy inquiries & contact messages).
 */

export function Field({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  const v = value == null || value === '' ? '—' : String(value);
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">{v}</dd>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground border-b pb-1">
        {title}
      </h3>
      <dl className="grid gap-2">{children}</dl>
    </div>
  );
}
