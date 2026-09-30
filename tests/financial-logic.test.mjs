import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEMI } from '../frontend/modules/emi.js';
import { assessLoan } from '../frontend/modules/loan.js';
import { analyzeCredit } from '../frontend/modules/credit.js';
import { localGuidance } from '../frontend/modules/ai.js';

test('EMI matches standard 1 lakh, 12%, 1 year example', () => {
  const r = calculateEMI(100000, 12, 1);
  assert.ok(Math.abs(r.emi - 8884.8789) < .01);
  assert.equal(r.installments, 12);
  assert.ok(r.totalInterest > 6000 && r.totalInterest < 7000);
});
test('EMI handles zero interest and rejects invalid values', () => {
  assert.equal(calculateEMI(12000, 0, 1).emi, 1000);
  assert.throws(() => calculateEMI(0, 5, 1), RangeError);
  assert.throws(() => calculateEMI(Infinity, 5, 1), RangeError);
  assert.throws(() => calculateEMI(10, -1, 1), RangeError);
});
test('EMI long tenure remains finite and predictable', () => {
  const r = calculateEMI(10000000, 30, 30);
  assert.ok(Number.isFinite(r.emi));
  assert.ok(r.totalPayment > 10000000);
});
test('loan estimate is deterministic and affordability capped', () => {
  const x={age:32,income:85000,employment:'salaried',experience:4,score:740,debt:12000,amount:1200000,tenure:5,rate:12};
  assert.deepEqual(assessLoan(x), assessLoan(x));
  assert.ok(assessLoan(x).estimate <= x.amount);
  assert.ok(assessLoan(x).monthlyEmi > 0);
});
test('loan hard stops and elevated debt affect outcome', () => {
  const x={age:32,income:85000,employment:'salaried',experience:4,score:740,debt:0,amount:300000,tenure:5,rate:12};
  assert.equal(assessLoan({...x,age:75}).status,'Not eligible in this example');
  assert.ok(assessLoan({...x,debt:50000}).risks.length > assessLoan(x).risks.length);
});
test('credit bands and utilization guidance are deterministic', () => {
  assert.equal(analyzeCredit({score:800,payments:'on-time',utilization:20,history:6,accounts:2,inquiries:1,debt:0}).category,'Excellent');
  assert.equal(analyzeCredit({score:749,payments:'mixed',utilization:70,history:1,accounts:3,inquiries:4,debt:1000}).category,'Fair');
  assert.equal(analyzeCredit({score:600,payments:'missed',utilization:50,history:1,accounts:3,inquiries:4,debt:1000}).category,'Needs improvement');
});
test('local financial guidance contains actions and cautions', () => {
  const r=localGuidance({income:80000,expenses:45000,debt:10000,score:680,savings:20000,goal:'home'});
  assert.ok(r.summary.length > 10);
  assert.ok(r.actions.length >= 2);
  assert.ok(r.cautions.length >= 1);
  assert.ok(r.nextSteps.length >= 1);
});
