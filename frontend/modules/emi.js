export function calculateEMI(principal, annualRate, years) {
  if (![principal, annualRate, years].every(Number.isFinite) || principal <= 0 || annualRate < 0 || years <= 0 || principal > 1e12 || annualRate > 100 || years > 100) throw new RangeError('Enter a positive loan amount and tenure with a valid interest rate.');
  const n = years * 12, r = annualRate / 1200;
  const emi = r === 0 ? principal / n : principal * r * (1 + r) ** n / ((1 + r) ** n - 1);
  if (!Number.isFinite(emi)) throw new RangeError('These values are outside the supported calculation range.');
  return { emi, totalPayment: emi * n, totalInterest: emi * n - principal, installments: n };
}
