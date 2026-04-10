/** Public copy for reservation tiles (matches slot_index 1..n on the litter). */
export function pickDepositLabel(
  slotIndex: number,
  t: (key: string) => string
): string {
  switch (slotIndex) {
    case 1:
      return t("upcomingPickFirstDeposit");
    case 2:
      return t("upcomingPickSecondDeposit");
    case 3:
      return t("upcomingPickThirdDeposit");
    case 4:
      return t("upcomingPickFourthDeposit");
    default:
      return t("upcomingPickNthDeposit").replace("{{n}}", String(slotIndex));
  }
}
