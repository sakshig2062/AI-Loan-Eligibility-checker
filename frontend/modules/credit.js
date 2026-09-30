export function analyzeCredit(x) {
  const category = x.score >= 800 ? 'Excellent' : x.score >= 750 ? 'Good' : x.score >= 650 ? 'Fair' : 'Needs improvement';
  const positive = [], negative = [], actions = [];
  if (x.payments === 'on-time') positive.push('You report a generally on-time payment history.'); else { negative.push(x.payments === 'mixed' ? 'You report some late payments.' : 'You report recent missed payments.'); actions.push('Bring any overdue accounts current and set reminders or autopay where appropriate.'); }
  if (x.utilization < 30) positive.push('Reported utilization is below the 30% guide.'); else { negative.push('Reported utilization is at or above 30%.'); actions.push('If affordable, reduce revolving balances before taking on new credit.'); }
  if (x.history >= 5) positive.push('Your reported credit history spans at least five years.'); else actions.push('Time and consistent account management can build a longer history.');
  if (x.inquiries <= 2) positive.push('Few recent credit inquiries were reported.'); else { negative.push('Several recent inquiries may make lenders look more closely.'); actions.push('Space out non-essential credit applications.'); }
  if (x.accounts === 0) actions.push('If you have accounts, check your bureau report to ensure they are recorded accurately.');
  if (x.debt > 0) actions.push('Keep total repayments manageable relative to your income; this snapshot does not know your income.');
  if (!actions.length) actions.push('Check your credit report for accuracy and keep payment and balance habits consistent.');
  return { category, score: x.score, positive, negative, actions, utilization: x.utilization, utilizationLabel: x.utilization < 30 ? 'Within the 30% guide' : 'Above the 30% guide', disclaimer: 'This is a simplified educational analysis, not a bureau score or credit report.' };
}
