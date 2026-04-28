export function computeStatus(expiryDate: string | null | undefined, backendStatus: string, gracePeriodDays = 0): string {
  if (backendStatus === "Removed") return "Removed";
  if (backendStatus === "Suspended") return "Suspended";
  if (!expiryDate) return "Active";

  try {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const safeGraceDays = Number.isFinite(gracePeriodDays) ? Math.max(0, gracePeriodDays) : 0;

    if (expiry > now) {
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) return "Due Soon";
      return "Active";
    }

    const daysPastExpiry = Math.floor((now.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));

    if (safeGraceDays > 0 && daysPastExpiry <= safeGraceDays) {
      return "Grace Period";
    }

    return "Expired";
  } catch {
    return "Active";
  }
}

/** 
 * Calculates debt based on full monthly plan increments that have PASSED.
 * If expired for 1 day, debt = 1 month.
 * If expired for 31 days, debt = 2 months.
 * 
 * NEW LOGIC: Debt only continues to accumulate while Trakzee is 'Active'.
 * If Trakzee is 'Deactivated', the debt is frozen at the deactivation date.
 */
export function calculateOwed(
  expiryDate: string | null | undefined, 
  monthlyAmount: number, 
  trakzeeStatus: 'Active' | 'Deactivated' = 'Active',
  updatedAt?: string | null
): number {
  if (!expiryDate || !monthlyAmount) return 0;

  try {
    // Per user request: if deactivated, they have no amount owed
    if (trakzeeStatus === 'Deactivated') return 0;

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    
    if (expiry > endDate) return 0;

    const diffTime = endDate.getTime() - expiry.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Every 30 day period or fraction thereof is 1 month of debt
    const debtMonths = Math.ceil(diffDays / 30) || 1;

    return debtMonths * monthlyAmount;
  } catch (e) {
    return 0;
  }
}
