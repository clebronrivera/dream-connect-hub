// "Reserved for" customer picker for the puppy form.
//
// Typeahead over the customers table by name / email / phone. Selecting a
// row writes its id to puppies.reserved_for_customer_id; "Clear" clears it.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import type { Customer } from "@/lib/supabase";
import { searchCustomers, fetchCustomerById } from "@/lib/admin/customers-service";

interface Props {
  value: string | null;
  onChange: (next: string | null) => void;
}

function customerLabel(c: Customer): string {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return name || c.email || c.phone || "Unnamed customer";
}

export function ReservedForField({ value, onChange }: Props) {
  const [term, setTerm] = useState("");
  const [touched, setTouched] = useState(false);

  // Resolve the currently-attached customer so we can show their label.
  const { data: current } = useQuery({
    queryKey: ["customer", value],
    queryFn: () => (value ? fetchCustomerById(value) : Promise.resolve(null)),
    enabled: !!value,
  });

  const { data: results, isFetching } = useQuery({
    queryKey: ["customer-search", term],
    queryFn: () => searchCustomers(term),
    enabled: touched && term.trim().length >= 2,
  });

  // Reset search inputs when the assignment changes — done via the
  // "adjust state during render" idiom rather than a useEffect so the
  // reset lands the same cycle the value flips.
  const [prevValue, setPrevValue] = useState<string | null>(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (term !== "" || touched) {
      setTerm("");
      setTouched(false);
    }
  }

  if (value && current) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm">
          <span className="font-medium">{customerLabel(current)}</span>
          {current.email ? (
            <span className="ml-2 text-xs text-muted-foreground">
              {current.email}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange(null)}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search by name, email, or phone…"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setTouched(true);
        }}
      />
      {touched && term.trim().length >= 2 && (
        <div className="rounded-md border bg-background">
          {isFetching ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </div>
          ) : results && results.length > 0 ? (
            <ul className="max-h-64 divide-y overflow-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onChange(c.id)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <div className="font-medium">{customerLabel(c)}</div>
                    <div className="text-xs text-muted-foreground">
                      {[c.email, c.phone].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-sm text-muted-foreground">
              No customer found. Customers are created automatically when an
              inquiry or deposit request comes in.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
