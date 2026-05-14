/**
 * Shared PuppyJoinData fixture for PDF fill tests.
 * Import into test-fill.ts and any future fill-verification scripts.
 */

import type { PuppyJoinData } from "../depositAgreementFieldMap.ts";

/** Realistic puppy join — dam/sire from upcoming_litters. */
export const puppyJoinFixture: PuppyJoinData = {
  sex: "Female",
  litter: {
    dam_name:  "Luna",
    sire_name: "Duke",
  },
};
