// Pin hashing using PBKDF2-SHA256 via the Web Crypto API.
//
// Why PBKDF2 instead of bcrypt: bcryptjs (the JS bcrypt port) has a CommonJS
// shape that doesn't play nicely with Deno's esm.sh interop and crashes the
// edge function at import time. PBKDF2 is natively supported by Deno's
// crypto.subtle, requires no external dependency, and at 100k iterations is
// strong enough for the breeder-tool threat model — a 4-digit pin
// (10,000 possibilities) gated by a 5-fail-per-15-min-per-IP rate limit.
//
// Storage format (single column, text): "pbkdf2$<iterations>$<saltB64>$<hashB64>"

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveBits(
  pin: string,
  salt: Uint8Array,
  iterations: number,
  bits: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    bits,
  );
  return new Uint8Array(derived);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(pin, salt, ITERATIONS, HASH_BITS);
  return `pbkdf2$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1]!, 10);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = base64ToBytes(parts[2]!);
    expected = base64ToBytes(parts[3]!);
  } catch {
    return false;
  }
  const derived = await deriveBits(pin, salt, iterations, expected.length * 8);
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i]! ^ expected[i]!;
  return diff === 0;
}
