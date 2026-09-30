const api = '/api';
export async function generateGuidance(profile) {
  try {
    const response = await fetch(`${api}/tips`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile), signal: AbortSignal.timeout(18000) });
    if (response.ok) { const data = await response.json(); if (typeof data.summary === 'string' && data.summary.trim() && Array.isArray(data.actions)) return { ...data, mode: 'AI-assisted' }; }
    // Missing API/server and provider failures intentionally fall through to the honest local guide.
  } catch (_) { /* offline mode is supported */ }
  return { ...localGuidance(profile), mode: 'On-device guide' };
}
export function localGuidance(p) {
  const savingsRate = (p.income - p.expenses - p.debt) / p.income;
  const observations = [], actions = [], cautions = [];
  if (savingsRate >= .2) observations.push(`After reported expenses and EMIs, about ${Math.round(savingsRate * 100)}% of monthly income remains.`);
  else if (savingsRate > 0) observations.push('Your reported budget has a positive monthly margin, though it may be limited.');
  else { observations.push('Reported expenses and EMIs use all or more than your monthly income.'); cautions.push('Avoid taking on additional repayments until the monthly budget has room.'); }
  if (p.savings < p.expenses * 3) { actions.push('Consider gradually building a liquid buffer towards three months of essential expenses.'); cautions.push('Keep near-term emergency money accessible before locking it into long-term goals.'); }
  else actions.push('Keep a portion of savings accessible for unexpected expenses.');
  if (p.debt / p.income > .35) actions.push('Review repayment rates and balances; prioritize costly debt if it fits your budget.');
  else actions.push('Keep any new loan EMI comfortable alongside current commitments and essential costs.');
  if (p.score && p.score < 700) actions.push('Review your credit report for errors and maintain on-time payments.');
  if (p.goal === 'home') actions.push('Budget for the down payment, registration and moving costs in addition to the EMI.');
  if (p.goal === 'vehicle') actions.push('Compare the total interest and ownership costs, not only the advertised monthly EMI.');
  if (!cautions.length) cautions.push('Rates and loan terms can change. Compare written offers and fees before committing.');
  return { summary: `For your goal to ${goalText(p.goal)}, start with a repayment plan that leaves room for essentials and surprises.`, observations, actions, cautions, nextSteps: ['Confirm your monthly budget using recent statements.', 'Compare lender terms and the total amount repayable.', 'Revisit this plan if your income or expenses change.'] };
}
function goalText(goal) { return ({ home:'buy a home', vehicle:'finance a vehicle', debt:'pay down debt', emergency:'build emergency savings', general:'improve your finances' })[goal] || 'improve your finances'; }
