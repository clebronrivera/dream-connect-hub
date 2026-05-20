// Small inline badge placed next to field labels in the admin puppy form
// to indicate that this field can also be updated by the breeder from her portal.

import { PawPrint } from "lucide-react";

export function BreederBadge() {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-200">
      <PawPrint className="h-2.5 w-2.5" aria-hidden />
      Breeder
    </span>
  );
}
