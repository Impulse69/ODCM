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
 * Calculates debt based on monthly increments.
 * 
 * NEW LOGIC: 
 * 1. Debt accumulates while Trakzee is 'Active' past the expiry date.
 * 2. Arrears are calculated by rounding up the number of months since expiry.
 */
export function calculateOwed(
  expiryDate: string | null | undefined, 
  monthlyAmount: number, 
  trakzeeStatus: 'Active' | 'Deactivated' = 'Active',
  referenceDate?: string | null): number {
  if (!expiryDate || !monthlyAmount) return 0;

  try {
    // If Deactivated on Trakzee, they stop accruing debt (frozen)
    if (trakzeeStatus === 'Deactivated') return 0;

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const endDate = referenceDate ? new Date(referenceDate) : new Date();
    endDate.setHours(0, 0, 0, 0);
    
    if (expiry >= endDate) return 0;

    const diffTime = endDate.getTime() - expiry.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate full and partial months. If even 1 day into a new month, charge full month price.
    const monthsPast = Math.ceil(diffDays / 30);
    const debt = monthsPast * monthlyAmount;

    return Math.max(0, debt);
  } catch {
    return 0;
  }
}
