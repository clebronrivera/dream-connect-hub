// Touch-friendly 4-digit pin keypad. Phone-first: large buttons, big
// touch targets, no autocomplete or password manager interference.

import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

export interface PinKeypadProps {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (pin: string) => void;
  length?: number;
  disabled?: boolean;
}

const KEYS: Array<{ label: string; value: string } | "backspace" | "spacer"> = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  "spacer",
  { label: "0", value: "0" },
  "backspace",
];

export function PinKeypad({
  value,
  onChange,
  onComplete,
  length = 4,
  disabled,
}: PinKeypadProps) {
  const handleDigit = useCallback(
    (digit: string) => {
      if (disabled) return;
      if (value.length >= length) return;
      const next = (value + digit).slice(0, length);
      onChange(next);
      if (next.length === length) onComplete?.(next);
    },
    [disabled, length, onChange, onComplete, value],
  );

  const handleBackspace = useCallback(() => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }, [disabled, onChange, value]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, handleBackspace, handleDigit]);

  return (
    <div className="flex flex-col items-center gap-6" aria-label="Pin keypad">
      <div className="flex gap-3" role="status" aria-live="polite">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            aria-label={i < value.length ? "filled" : "empty"}
            className={`h-4 w-4 rounded-full border-2 transition ${
              i < value.length
                ? "border-primary bg-primary"
                : "border-muted-foreground/40 bg-transparent"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) => {
          if (key === "spacer") {
            return <div key={`spacer-${i}`} aria-hidden />;
          }
          if (key === "backspace") {
            return (
              <Button
                key="backspace"
                type="button"
                variant="ghost"
                size="lg"
                disabled={disabled || value.length === 0}
                onClick={handleBackspace}
                className="h-16 w-16 text-xl"
                aria-label="Delete last digit"
              >
                <Delete className="h-6 w-6" />
              </Button>
            );
          }
          return (
            <Button
              key={key.value}
              type="button"
              variant="outline"
              size="lg"
              disabled={disabled}
              onClick={() => handleDigit(key.value)}
              className="h-16 w-16 text-2xl font-semibold"
            >
              {key.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
