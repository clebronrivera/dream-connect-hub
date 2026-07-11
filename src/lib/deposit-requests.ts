/** Light client-side US phone validation — 10 or 11 digits after stripping non-digits. */
export function isValidUsPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith("1")) return true;
  return false;
}
