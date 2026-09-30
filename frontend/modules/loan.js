import { calculateEMI } from './emi.js';
export function assessLoan(x) {
  const reasons = [], positives = [], risks = [];
  if (x.age < 21 || x.age > 60) risks.push('Age is outside the illustrative preferred range of 21–60.'); else positives.push('Age is within the illustrative working-age range.');
  if (x.income < 25000) risks.push('Monthly income is below the example threshold of ₹25,000.'); else positives.push('Monthly income meets the example minimum.');
  if (x.score < 650) risks.push('Credit score below 650 may limit available terms.'); else if (x.score >= 750) positives.push('Credit score of 750 or higher is a positive signal in this model.'); else positives.push('Credit score is at or above the example minimum of 650.');
  const years = x.employment === 'salaried' ? .75 : 1.5;
  if (x.experience < years) risks.push(`Work experience is below the ${years}-year example stability threshold.`); else positives.push('Work experience meets the example stability threshold.');
  const available = Math.max(0, x.income * .45 - x.debt);
  const affordability = calculateEMI(x.amount, x.rate, x.tenure);
  const burden = (x.debt + affordability.emi) / x.income;
  const monthlyRate = x.rate / 1200;
  const maxPrincipal = available <= 0 ? 0 : monthlyRate === 0 ? available * x.tenure * 12 : available * (1 - (1 + monthlyRate) ** (-x.tenure * 12)) / monthlyRate;
  if (x.debt / x.income > .45) risks.push('Existing monthly EMI already exceeds 45% of income.'); else positives.push('Existing EMI is within the model’s 45% affordability guide.');
  if (burden > .45) risks.push(`Requested loan would raise estimated EMI burden to ${Math.round(burden * 100)}% of income.`); else positives.push(`Estimated EMI burden would be ${Math.round(burden * 100)}% of income.`);
  if (maxPrincipal < x.amount) risks.push(`Requested amount is above the illustrative affordable amount of ${Math.round(maxPrincipal)}.`);
  const hardFail = x.age < 18 || x.age >= 70 || x.income < 15000 || x.score < 550 || available <= 0;
  const eligible = !hardFail && risks.length <= 1;
  const status = hardFail ? 'Not eligible in this example' : eligible ? 'Within the example range' : 'Review your borrowing plan';
  reasons.push(...positives, ...risks);
  return { status, eligible, estimate: Math.max(0, Math.min(x.amount, maxPrincipal)), monthlyEmi: affordability.emi, burden: burden * 100, positives, risks, reasons, disclaimer: 'A transparent demo estimate only. Lender policies, rates, costs and your full circumstances will differ.' };
}
