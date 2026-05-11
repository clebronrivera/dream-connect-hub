import { useContext } from "react";
import { BreederAuthContext } from "@/contexts/BreederAuthContext";

export function useBreederAuth() {
  const ctx = useContext(BreederAuthContext);
  if (!ctx) {
    throw new Error("useBreederAuth must be used inside <BreederAuthProvider>");
  }
  return ctx;
}
