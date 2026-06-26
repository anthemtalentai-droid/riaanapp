/**
 * Job profitability calculation module.
 *
 * IMPORTANT — these formulas are provisional. Confirm exact definitions with Riaan before go-live:
 *   - What counts as "revenue" — quoted total, invoiced total, or paid total?
 *   - Overhead allocation (vehicles, insurance, yard costs)?
 *   - Overtime multiplier for labour cost?
 *   - Which expenses belong to "on-site profit" vs other cost centres?
 *
 * All four figures are computed here in one isolated function so they're trivial to adjust.
 */

export interface ProfitabilityInput {
  revenue: number;          // accepted quote total (incl. VAT) — swap to invoiced/paid when confirmed
  materialsTotal: number;   // sum of MaterialUsed.totalCost across all DailySiteReports
  labourTotal: number;      // sum of (TimeEntry.hoursWorked × WageRate.ratePerHour) per worker
  daysOnSite: number;       // (completedAt || today) − startDate in calendar days
  invoicesTotal: number;    // total of Invoice.total for this job
  amountPaid: number;       // total of Invoice.amountPaid for this job
}

export interface ProfitabilityResult {
  onSiteProfit: number;     // revenue − materials − labour
  onSiteProfitPerDay: number; // onSiteProfit ÷ daysOnSite
  onSiteProfitPct: number;  // onSiteProfit ÷ revenue × 100
  realisedProfit: number;   // profit on the portion actually collected (amountPaid − proportional costs)
}

export function computeProfitability(input: ProfitabilityInput): ProfitabilityResult {
  const { revenue, materialsTotal, labourTotal, daysOnSite, amountPaid } = input;

  const onSiteProfit = revenue - materialsTotal - labourTotal;
  const onSiteProfitPerDay = daysOnSite > 0 ? onSiteProfit / daysOnSite : 0;
  const onSiteProfitPct = revenue > 0 ? (onSiteProfit / revenue) * 100 : 0;

  // Realised profit: scale costs by (amountPaid / revenue) — PLACEHOLDER definition, confirm with Riaan
  const collectionRatio = revenue > 0 ? amountPaid / revenue : 0;
  const realisedProfit = amountPaid - (materialsTotal + labourTotal) * collectionRatio;

  return {
    onSiteProfit: round2(onSiteProfit),
    onSiteProfitPerDay: round2(onSiteProfitPerDay),
    onSiteProfitPct: round2(onSiteProfitPct),
    realisedProfit: round2(realisedProfit),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
