// Local persistence for the per-puppy capture flow.
//
// Two keys:
//   - `breeder:lastPuppy:{litterId}` — the puppy ID most recently visited
//     in this litter's wizard / capture. Wizard surfaces a "Continue with
//     [name]" affordance when set.
//   - `breeder:step:{puppyId}` — the step name (face / back / price / etc.)
//     the breeder was last on for a given puppy. BreederPuppyCapture
//     restores to that step on mount.
//
// Both are best-effort UX hints — losing them is harmless (the user just
// starts from step 1).

const LAST_PUPPY_PREFIX = "breeder:lastPuppy:";
const STEP_PREFIX = "breeder:step:";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota / private mode — ignore */
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function setLastPuppyForLitter(litterId: string, puppyId: string): void {
  safeSet(LAST_PUPPY_PREFIX + litterId, puppyId);
}

export function getLastPuppyForLitter(litterId: string): string | null {
  return safeGet(LAST_PUPPY_PREFIX + litterId);
}

export function clearLastPuppyForLitter(litterId: string): void {
  safeRemove(LAST_PUPPY_PREFIX + litterId);
}

export function setStepForPuppy(puppyId: string, step: string): void {
  safeSet(STEP_PREFIX + puppyId, step);
}

export function getStepForPuppy(puppyId: string): string | null {
  return safeGet(STEP_PREFIX + puppyId);
}

export function clearStepForPuppy(puppyId: string): void {
  safeRemove(STEP_PREFIX + puppyId);
}
