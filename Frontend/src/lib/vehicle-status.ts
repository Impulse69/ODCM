/**
 * Compute display status from expiry date and backend status.
 * Uses date-string comparison to avoid timezone issues.
 */
export function computeStatus(expiryDate: string, backendStatus: string): string {
  if (backendStatus === "Suspended") return "Suspended";

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const expiryStr = expiryDate.slice(0, 10);

  if (expiryStr <= todayStr) return "Expired";

  const twoWeeks = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
  const twoWeeksStr = `${twoWeeks.getFullYear()}-${String(twoWeeks.getMonth() + 1).padStart(2, "0")}-${String(twoWeeks.getDate()).padStart(2, "0")}`;

  if (expiryStr <= twoWeeksStr) return "Due Soon";

  return "Active";
}
