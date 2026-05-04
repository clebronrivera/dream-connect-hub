import { describe, it, expect, vi } from "vitest";
import { isTransientSupabaseReadError, runWithTransientRetries } from "./supabase-query-retry";

describe("isTransientSupabaseReadError", () => {
  it("detects AbortError message", () => {
    expect(isTransientSupabaseReadError(new Error("AbortError: The operation was aborted."))).toBe(
      true
    );
  });

  it("detects DOMException AbortError", () => {
    expect(isTransientSupabaseReadError(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("detects Failed to fetch", () => {
    expect(isTransientSupabaseReadError(new Error("Failed to fetch"))).toBe(true);
  });

  it("returns false for RLS-style errors", () => {
    expect(
      isTransientSupabaseReadError(new Error("new row violates row-level security policy"))
    ).toBe(false);
  });
});

describe("runWithTransientRetries", () => {
  it("retries until success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("AbortError: The operation was aborted."))
      .mockResolvedValueOnce("ok");

    const result = await runWithTransientRetries(fn, { attempts: 3, baseDelayMs: 0 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
