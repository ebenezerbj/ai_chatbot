/**
 * Finance Calculator Module
 * Comprehensive loan calculations, budget planning, and financial tools.
 *
 * Covers:
 * - Loan payments (fixed-rate amortization with reducing balance)
 * - Full amortization schedule generation
 * - Scenario comparisons (different rates, terms, prepayment)
 * - Loan prequalification / affordability check
 * - Budget & cash-flow projections
 * - Credit-score improvement tips
 * - CSV / text export helpers
 */

// ───────────────────── Types ─────────────────────

export interface LoanInput {
  principal: number;           // Loan amount (GHS)
  annualRate: number;          // Annual interest rate as percentage e.g. 27 for 27%
  termMonths: number;          // Repayment period in months
  paymentFrequency?: 'monthly' | 'biweekly' | 'weekly'; // default: monthly
  processingFeePercent?: number;  // e.g. 3.5 for 3.5%
  insuranceFeePercent?: number;   // e.g. 0.4 for 0.4%
  currency?: string;           // default: GHS
}

export interface AmortizationRow {
  period: number;
  payment: number;
  principalPortion: number;
  interestPortion: number;
  balance: number;
}

export interface LoanResult {
  periodicPayment: number;
  totalPayment: number;
  totalInterest: number;
  totalFees: number;
  totalCost: number;            // totalPayment + totalFees
  effectiveRate: number;        // APR accounting for fees
  schedule: AmortizationRow[];
  currency: string;
  paymentFrequency: string;
  termMonths: number;
  principal: number;
  annualRate: number;
}

export interface ScenarioComparison {
  scenarios: Array<LoanResult & { label: string }>;
  summary: string;
}

export interface PrequalResult {
  eligible: boolean;
  maxLoanAmount: number;
  maxMonthlyPayment: number;
  dtiRatio: number;
  notes: string[];
}

export interface BudgetProjection {
  months: Array<{
    month: number;
    income: number;
    expenses: number;
    loanPayment: number;
    netCash: number;
    cumulativeSavings: number;
  }>;
  totalIncome: number;
  totalExpenses: number;
  totalLoanPayments: number;
  totalNet: number;
}

// ──────────── AKCB Default Rate Table ────────────

export const AKCB_RATES: Record<string, { annualRate?: number; monthlyRate?: number; label: string }> = {
  salary:       { annualRate: 27,  label: 'Salaried Workers Loan' },
  trade:        { annualRate: 28,  label: 'Trade Loans / Overdraft' },
  microfinance: { annualRate: 34,  label: 'Micro Finance' },
  susu:         { annualRate: 34,  label: 'Susu Loans' },
  overdraft:    { monthlyRate: 10, label: 'Overdraft (Workers)' },
  funeral:      { monthlyRate: 12, label: 'Funeral Loan' },
  agriculture:  { annualRate: 34,  label: 'Agriculture & Inventory' },
  inventory:    { annualRate: 34,  label: 'Inventory Financing' },
};

export const AKCB_FEES = {
  insurancePercent: 0.4,
  processingCleanPercent: 3.5,
  processingSecuredPercent: 2.5,
};

// ───────────── Core Calculations ─────────────────

/**
 * Compute periodic payment using the standard amortization formula:
 *   PMT = P × r × (1+r)^n / ((1+r)^n − 1)
 * where r = periodic interest rate, n = number of periods.
 * Falls back to simple division when rate is 0.
 */
export function computePeriodicPayment(principal: number, annualRate: number, termMonths: number, frequency: 'monthly' | 'biweekly' | 'weekly' = 'monthly'): number {
  if (principal <= 0 || termMonths <= 0) return 0;

  const periodsPerYear = frequency === 'monthly' ? 12 : frequency === 'biweekly' ? 26 : 52;
  const totalPeriods = frequency === 'monthly' ? termMonths : Math.round(termMonths * (periodsPerYear / 12));
  const periodicRate = (annualRate / 100) / periodsPerYear;

  if (periodicRate === 0) {
    return round2(principal / totalPeriods);
  }

  const factor = Math.pow(1 + periodicRate, totalPeriods);
  const payment = principal * periodicRate * factor / (factor - 1);
  return round2(payment);
}

/**
 * Generate a full amortization schedule (reducing-balance method).
 */
export function generateAmortizationSchedule(input: LoanInput): LoanResult {
  const {
    principal,
    annualRate,
    termMonths,
    paymentFrequency = 'monthly',
    processingFeePercent = 0,
    insuranceFeePercent = 0,
    currency = 'GHS',
  } = input;

  const periodsPerYear = paymentFrequency === 'monthly' ? 12 : paymentFrequency === 'biweekly' ? 26 : 52;
  const totalPeriods = paymentFrequency === 'monthly' ? termMonths : Math.round(termMonths * (periodsPerYear / 12));
  const periodicRate = (annualRate / 100) / periodsPerYear;

  const payment = computePeriodicPayment(principal, annualRate, termMonths, paymentFrequency);

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPayment = 0;

  for (let i = 1; i <= totalPeriods; i++) {
    const interestPortion = round2(balance * periodicRate);
    let principalPortion = round2(payment - interestPortion);

    // Last period: correct rounding drift
    if (i === totalPeriods) {
      principalPortion = round2(balance);
    }

    balance = round2(Math.max(0, balance - principalPortion));
    const actualPayment = round2(principalPortion + interestPortion);

    totalInterest += interestPortion;
    totalPayment += actualPayment;

    schedule.push({
      period: i,
      payment: actualPayment,
      principalPortion,
      interestPortion,
      balance,
    });
  }

  totalInterest = round2(totalInterest);
  totalPayment = round2(totalPayment);

  const processingFee = round2(principal * (processingFeePercent / 100));
  const insuranceFee = round2(principal * (insuranceFeePercent / 100));
  const totalFees = round2(processingFee + insuranceFee);
  const totalCost = round2(totalPayment + totalFees);

  // Effective APR (simplified — includes up-front fees amortized over term)
  const effectiveRate = principal > 0 ? round2(((totalCost - principal) / principal) * (12 / termMonths) * 100) : 0;

  return {
    periodicPayment: payment,
    totalPayment,
    totalInterest,
    totalFees,
    totalCost,
    effectiveRate,
    schedule,
    currency,
    paymentFrequency,
    termMonths,
    principal,
    annualRate,
  };
}

// ───────────── Scenario Comparison ───────────────

/**
 * Compare multiple loan scenarios side-by-side.
 */
export function compareScenarios(scenarios: Array<LoanInput & { label?: string }>): ScenarioComparison {
  const results = scenarios.map((s, idx) => {
    const result = generateAmortizationSchedule(s);
    return { ...result, label: s.label || `Scenario ${idx + 1}` };
  });

  // Build a human-readable summary
  const cheapest = results.reduce((a, b) => a.totalCost < b.totalCost ? a : b);
  const lines = results.map(r =>
    `${r.label}: ${r.currency} ${fmt(r.periodicPayment)}/${r.paymentFrequency} payment, ${r.currency} ${fmt(r.totalCost)} total cost (${r.currency} ${fmt(r.totalInterest)} interest + ${r.currency} ${fmt(r.totalFees)} fees)`
  );
  lines.push(`\n✅ Lowest total cost: ${cheapest.label} saves ${cheapest.currency} ${fmt(round2(results.reduce((a, b) => a.totalCost > b.totalCost ? a : b).totalCost - cheapest.totalCost))} compared to the most expensive option.`);

  return { scenarios: results, summary: lines.join('\n') };
}

/**
 * Quick comparison: prepay vs standard.
 */
export function prepaymentImpact(input: LoanInput, extraMonthlyPayment: number): { standard: LoanResult; withPrepayment: LoanResult; monthsSaved: number; interestSaved: number } {
  const standard = generateAmortizationSchedule(input);

  // Simulate custom schedule with extra payments
  const { principal, annualRate, paymentFrequency = 'monthly', currency = 'GHS' } = input;
  const periodsPerYear = paymentFrequency === 'monthly' ? 12 : paymentFrequency === 'biweekly' ? 26 : 52;
  const periodicRate = (annualRate / 100) / periodsPerYear;
  const basePayment = standard.periodicPayment;
  const acceleratedPayment = basePayment + extraMonthlyPayment;

  let balance = principal;
  let totalInterest = 0;
  let periods = 0;
  const schedule: AmortizationRow[] = [];

  while (balance > 0.01 && periods < standard.schedule.length * 2) {
    periods++;
    const interestPortion = round2(balance * periodicRate);
    let principalPortion = round2(Math.min(balance, acceleratedPayment - interestPortion));
    if (principalPortion < 0) principalPortion = 0;
    balance = round2(Math.max(0, balance - principalPortion));
    totalInterest += interestPortion;
    schedule.push({ period: periods, payment: round2(principalPortion + interestPortion), principalPortion, interestPortion, balance });
  }

  const withPrepayment: LoanResult = {
    ...standard,
    periodicPayment: acceleratedPayment,
    totalPayment: round2(schedule.reduce((s, r) => s + r.payment, 0)),
    totalInterest: round2(totalInterest),
    totalCost: round2(schedule.reduce((s, r) => s + r.payment, 0) + standard.totalFees),
    schedule,
    termMonths: Math.ceil(periods * (12 / periodsPerYear)),
  };

  return {
    standard,
    withPrepayment,
    monthsSaved: standard.termMonths - withPrepayment.termMonths,
    interestSaved: round2(standard.totalInterest - withPrepayment.totalInterest),
  };
}

// ───────────── Prequalification ──────────────────

/**
 * Simple prequalification / affordability check.
 * Uses debt-to-income ratio (DTI). Standard threshold: 40%.
 */
export function prequalify(monthlyIncome: number, existingMonthlyDebt: number, annualRate: number, termMonths: number, dtiLimit: number = 40): PrequalResult {
  const notes: string[] = [];
  const maxDtiPayment = round2(monthlyIncome * (dtiLimit / 100) - existingMonthlyDebt);

  if (maxDtiPayment <= 0) {
    return { eligible: false, maxLoanAmount: 0, maxMonthlyPayment: 0, dtiRatio: round2((existingMonthlyDebt / monthlyIncome) * 100), notes: ['Existing debt already exceeds the allowable debt-to-income ratio.'] };
  }

  // Reverse-engineer max principal from max affordable payment
  const monthlyRate = (annualRate / 100) / 12;
  let maxPrincipal: number;
  if (monthlyRate === 0) {
    maxPrincipal = maxDtiPayment * termMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    maxPrincipal = maxDtiPayment * (factor - 1) / (monthlyRate * factor);
  }
  maxPrincipal = round2(maxPrincipal);

  const dti = round2(((existingMonthlyDebt + maxDtiPayment) / monthlyIncome) * 100);

  notes.push(`Maximum affordable monthly payment: GHS ${fmt(maxDtiPayment)} (at ${dtiLimit}% DTI limit)`);
  notes.push(`Estimated maximum loan amount: GHS ${fmt(maxPrincipal)} at ${annualRate}% p.a. over ${termMonths} months`);
  if (dti > 35) notes.push('⚠️ Your debt-to-income ratio is on the higher side. Consider a shorter term or smaller amount.');

  return { eligible: true, maxLoanAmount: maxPrincipal, maxMonthlyPayment: maxDtiPayment, dtiRatio: dti, notes };
}

// ───────────── Budget & Cash-Flow ────────────────

/**
 * Project monthly cash flow over N months, optionally including a loan payment.
 */
export function projectCashFlow(monthlyIncome: number, monthlyExpenses: number, loanPayment: number = 0, months: number = 12): BudgetProjection {
  const rows: BudgetProjection['months'] = [];
  let cumulative = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalLoan = 0;

  for (let m = 1; m <= months; m++) {
    const net = round2(monthlyIncome - monthlyExpenses - loanPayment);
    cumulative = round2(cumulative + net);
    totalIncome += monthlyIncome;
    totalExpenses += monthlyExpenses;
    totalLoan += loanPayment;
    rows.push({ month: m, income: monthlyIncome, expenses: monthlyExpenses, loanPayment, netCash: net, cumulativeSavings: cumulative });
  }

  return {
    months: rows,
    totalIncome: round2(totalIncome),
    totalExpenses: round2(totalExpenses),
    totalLoanPayments: round2(totalLoan),
    totalNet: round2(cumulative),
  };
}

// ───────────── Credit Score Tips ─────────────────

export function getCreditScoreTips(): string[] {
  return [
    'Pay all loan instalments and bills on time — payment history is the biggest factor.',
    'Keep your credit utilization below 30% of available credit.',
    'Avoid applying for multiple loans or credit products in a short period.',
    'Maintain a mix of credit types (e.g. instalment loan + savings account).',
    'Check your credit report regularly for errors and dispute inaccuracies.',
    'Keep old accounts open to lengthen your credit history.',
    'Pay off existing debt before taking on new obligations.',
    'Set up automatic payments or reminders to avoid missed due dates.',
  ];
}

// ───────────── Export Helpers ─────────────────────

/**
 * Format a loan result as a plain-text summary suitable for chat display.
 */
export function formatLoanSummary(result: LoanResult): string {
  const lines = [
    `━━━ Loan Calculation Summary ━━━`,
    `Loan Amount: ${result.currency} ${fmt(result.principal)}`,
    `Interest Rate: ${result.annualRate}% per annum`,
    `Term: ${result.termMonths} months (${(result.termMonths / 12).toFixed(1)} years)`,
    `Payment Frequency: ${result.paymentFrequency}`,
    ``,
    `📊 Results:`,
    `  ${capitalize(result.paymentFrequency)} Payment: ${result.currency} ${fmt(result.periodicPayment)}`,
    `  Total Interest: ${result.currency} ${fmt(result.totalInterest)}`,
    `  Total Fees: ${result.currency} ${fmt(result.totalFees)}`,
    `  Total Cost: ${result.currency} ${fmt(result.totalCost)}`,
    `  Effective Rate: ${result.effectiveRate}% p.a.`,
  ];
  return lines.join('\n');
}

/**
 * Format an amortization schedule as a text table (first N rows + summary).
 */
export function formatAmortizationTable(schedule: AmortizationRow[], currency: string = 'GHS', maxRows: number = 12): string {
  const header = `Period | Payment     | Principal   | Interest    | Balance`;
  const sep    = `-------|-------------|-------------|-------------|-------------`;
  const show = schedule.slice(0, maxRows);
  const rows = show.map(r =>
    `${String(r.period).padStart(5)}  | ${currency} ${fmt(r.payment).padStart(8)} | ${currency} ${fmt(r.principalPortion).padStart(8)} | ${currency} ${fmt(r.interestPortion).padStart(8)} | ${currency} ${fmt(r.balance).padStart(8)}`
  );
  let text = [header, sep, ...rows].join('\n');
  if (schedule.length > maxRows) {
    text += `\n  ... (${schedule.length - maxRows} more periods) ...`;
    const last = schedule[schedule.length - 1];
    text += `\n${String(last.period).padStart(5)}  | ${currency} ${fmt(last.payment).padStart(8)} | ${currency} ${fmt(last.principalPortion).padStart(8)} | ${currency} ${fmt(last.interestPortion).padStart(8)} | ${currency} ${fmt(last.balance).padStart(8)}`;
  }
  return text;
}

/**
 * Export amortization schedule as CSV string.
 */
export function exportScheduleCSV(result: LoanResult): string {
  const header = 'Period,Payment,Principal,Interest,Balance';
  const rows = result.schedule.map(r =>
    `${r.period},${r.payment},${r.principalPortion},${r.interestPortion},${r.balance}`
  );
  return [header, ...rows].join('\n');
}

/**
 * Format a prequalification result as text.
 */
export function formatPrequalResult(r: PrequalResult): string {
  if (!r.eligible) {
    return `❌ Based on the information provided, you may not currently qualify.\nDebt-to-Income Ratio: ${r.dtiRatio}%\n${r.notes.join('\n')}`;
  }
  return [
    `✅ Prequalification Estimate`,
    `  Maximum Loan Amount: GHS ${fmt(r.maxLoanAmount)}`,
    `  Maximum Monthly Payment: GHS ${fmt(r.maxMonthlyPayment)}`,
    `  Debt-to-Income Ratio: ${r.dtiRatio}%`,
    ``,
    ...r.notes.map(n => `  ${n}`),
    ``,
    `⚠️ This is an estimate only. Final approval depends on credit assessment, collateral, and bank policy. Consult a loan officer for a formal evaluation.`,
  ].join('\n');
}

/**
 * Format budget projection as text.
 */
export function formatBudgetProjection(p: BudgetProjection, currency: string = 'GHS'): string {
  const lines = [
    `━━━ ${p.months.length}-Month Cash Flow Projection ━━━`,
    `Month | Income      | Expenses    | Loan Pmt    | Net Cash    | Cumulative`,
    `------|-------------|-------------|-------------|-------------|-------------`,
  ];
  for (const m of p.months) {
    lines.push(`${String(m.month).padStart(4)}  | ${currency} ${fmt(m.income).padStart(8)} | ${currency} ${fmt(m.expenses).padStart(8)} | ${currency} ${fmt(m.loanPayment).padStart(8)} | ${currency} ${fmt(m.netCash).padStart(8)} | ${currency} ${fmt(m.cumulativeSavings).padStart(8)}`);
  }
  lines.push(`\nTotals: Income ${currency} ${fmt(p.totalIncome)} | Expenses ${currency} ${fmt(p.totalExpenses)} | Loan ${currency} ${fmt(p.totalLoanPayments)} | Net ${currency} ${fmt(p.totalNet)}`);
  return lines.join('\n');
}

// ───────────── Utilities ─────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
