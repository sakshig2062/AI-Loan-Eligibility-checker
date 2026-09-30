import { calculateEMI } from './frontend/modules/emi.js';
import { validateForm, clearErrors } from './frontend/modules/validation.js';
import { assessLoan } from './frontend/modules/loan.js';
import { analyzeCredit } from './frontend/modules/credit.js';
import { generateGuidance } from './frontend/modules/ai.js';
import { saveRecord } from './frontend/modules/storage.js';

const $ = (q, root = document) => root.querySelector(q);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(value));
const number = (form, key) => Number(form.elements.namedItem(key).value);
const toast = $('#toast'); let toastTimer;
function notify(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3800); }
function busy(button, text) { const original = button.innerHTML; button.disabled = true; button.innerHTML = `<span class="spinner"></span> ${text}`; return () => { button.disabled = false; button.innerHTML = original; }; }
async function persist(kind, payload) { if (!$('#storage-opt-in').checked) return; const result = await saveRecord(kind, payload); notify(result.saved ? 'Record saved to the connected sheet.' : result.reason); }
function showResult(el, html) { el.classList.remove('result-enter'); el.innerHTML = html; requestAnimationFrame(() => el.classList.add('result-enter')); }
const loanForm = $('#loan-form');
loanForm.addEventListener('submit', async event => {
  event.preventDefault(); clearErrors(loanForm);
  const rules = { age:{required:true,min:18,max:75,integer:true},income:{required:true,min:1,max:1e9},experience:{required:true,min:0,max:60},score:{required:true,min:300,max:900,integer:true},debt:{required:true,min:0,max:1e9},amount:{required:true,min:1,max:1e10},tenure:{required:true,min:1,max:30},rate:{required:true,min:.1,max:60} };
  if (!validateForm(loanForm, rules)) { notify('Check the highlighted fields and try again.'); return; }
  const button = $('button[type="submit"]', loanForm), done = busy(button, 'Calculating…');
  try {
    await new Promise(resolve => setTimeout(resolve, 240));
    const input = { age:number(loanForm,'age'),income:number(loanForm,'income'),employment:loanForm.elements.employment.value,experience:number(loanForm,'experience'),score:number(loanForm,'score'),debt:number(loanForm,'debt'),amount:number(loanForm,'amount'),tenure:number(loanForm,'tenure'),rate:number(loanForm,'rate') };
    const result = assessLoan(input), statusClass = result.eligible ? 'good' : result.status.startsWith('Not') ? 'bad' : 'review';
    showResult($('#loan-result'), `<div class="result-content"><div class="result-header"><div><span class="result-overline">YOUR ESTIMATED OUTCOME</span><h3>Borrowing, with context.</h3></div><span class="result-badge ${statusClass}"><i></i>${result.status}</span></div><div class="amount-highlight"><span>Estimated affordable amount</span><strong>${money(result.estimate)}</strong><small>of ${money(input.amount)} requested</small></div><div class="result-metrics"><div><span>Illustrative EMI</span><strong>${money(result.monthlyEmi)}<small> / mo</small></strong></div><div><span>EMI burden</span><strong>${Math.round(result.burden)}<small>% of income</small></strong></div></div><div class="meter"><i style="width:${Math.min(100,result.burden)}%"></i></div><span class="meter-caption">New EMI plus existing commitments</span><h4>What shaped this estimate</h4><ul class="factor-list">${result.positives.map(x=>`<li class="positive"><i>✓</i>${x}</li>`).join('')}${result.risks.map(x=>`<li class="risk"><i>!</i>${x}</li>`).join('')}</ul><p class="result-disclaimer">◈ &nbsp;${result.disclaimer}</p></div>`);
    await persist('loan', { input, result });
  } catch (error) { showResult($('#loan-result'), `<div class="error-state"><span>!</span><h3>We couldn't calculate that.</h3><p>${escapeText(error.message || 'Check your values and try again.')}</p></div>`); } finally { done(); }
});

const creditForm = $('#credit-form');
creditForm.addEventListener('submit', async event => {
  event.preventDefault(); clearErrors(creditForm);
  if (!validateForm(creditForm,{score:{required:true,min:300,max:900,integer:true},utilization:{required:true,min:0,max:100},history:{required:true,min:0,max:80},accounts:{required:true,min:0,max:100,integer:true},inquiries:{required:true,min:0,max:50,integer:true},debt:{required:true,min:0,max:1e9}})) { notify('Check the highlighted fields and try again.'); return; }
  const button=$('button[type="submit"]',creditForm),done=busy(button,'Analyzing profile…');
  try { await new Promise(resolve=>setTimeout(resolve,220)); const input={score:number(creditForm,'score'),payments:creditForm.elements.payments.value,utilization:number(creditForm,'utilization'),history:number(creditForm,'history'),accounts:number(creditForm,'accounts'),inquiries:number(creditForm,'inquiries'),debt:number(creditForm,'debt')}; const r=analyzeCredit(input),percent=Math.max(0,Math.min(100,(r.score-300)/600*100));
    showResult($('#credit-result'), `<div class="result-content"><div class="result-header"><div><span class="result-overline">YOUR CREDIT SNAPSHOT</span><h3>A profile you can build on.</h3></div><span class="result-badge ${r.category==='Needs improvement'?'review':'good'}"><i></i>${r.category}</span></div><div class="score-showcase"><div class="score-ring" style="--score:${percent}%"><div><strong>${r.score}</strong><span>out of 900</span></div></div><div><span class="result-overline">CREDIT SCORE</span><h3>${r.category}</h3><p>Simplified indicator based on what you shared.</p></div></div><div class="meter-label-row"><span>Utilization</span><strong>${r.utilization}% · ${r.utilizationLabel}</strong></div><div class="meter"><i style="width:${Math.min(100,r.utilization)}%;background:${r.utilization<30?'var(--mint)':'var(--amber)'}"></i></div><h4>Strengths</h4><ul class="factor-list">${(r.positive.length?r.positive:['Keep tracking payment and balance habits as your profile evolves.']).map(x=>`<li class="positive"><i>✓</i>${x}</li>`).join('')}</ul>${r.negative.length?`<h4>Things to watch</h4><ul class="factor-list">${r.negative.map(x=>`<li class="risk"><i>!</i>${x}</li>`).join('')}</ul>`:''}<h4>Possible next steps</h4><ul class="factor-list">${r.actions.map(x=>`<li class="tip-item"><i>↗</i>${x}</li>`).join('')}</ul><p class="result-disclaimer">◈ &nbsp;${r.disclaimer}</p></div>`);
    await persist('credit',{input,result:r});
  } catch(error) { showResult($('#credit-result'),`<div class="error-state"><span>!</span><h3>We couldn't analyze that.</h3><p>${escapeText(error.message)}</p></div>`); } finally { done(); }
});

const emiForm=$('#emi-form');
function updateEMI() {
  const p=number(emiForm,'principal'),rate=number(emiForm,'interest'),years=number(emiForm,'years');
  $('#principal-display').textContent=money(p); $('#interest-display').textContent=`${rate}%`; $('#tenure-display').textContent=`${years} ${years===1?'year':'years'}`;
  try { const r=calculateEMI(p,rate,years),interestPercent=r.totalInterest/r.totalPayment*100; showResult($('#emi-result'),`<div class="result-content"><div class="result-header"><div><span class="result-overline">YOUR REPAYMENT PLAN</span><h3>Small steps, clearly mapped.</h3></div><span class="result-badge good"><i></i>Live estimate</span></div><div class="emi-hero"><span>Monthly instalment</span><strong>${money(r.emi)}<small> / month</small></strong></div><div class="result-metrics"><div><span>Total principal</span><strong>${money(p)}</strong></div><div><span>Total interest</span><strong>${money(r.totalInterest)}</strong></div></div><div class="repayment-bar"><i style="width:${100-interestPercent}%"></i><i style="width:${interestPercent}%"></i></div><div class="repayment-legend"><span><i></i>Principal · ${Math.round(100-interestPercent)}%</span><span><i></i>Interest · ${Math.round(interestPercent)}%</span></div><div class="total-box"><span>Total repayment over ${r.installments} months</span><strong>${money(r.totalPayment)}</strong></div><p class="result-disclaimer">⊞ &nbsp;Estimate uses a fixed rate and equal monthly payments. Fees, rate changes and lender terms are not included.</p></div>`); }
  catch(error) { showResult($('#emi-result'),`<div class="error-state"><span>!</span><h3>Adjust your inputs.</h3><p>${escapeText(error.message)}</p></div>`); }
}
for (const [range,textName] of [['principal','principalText'],['interest','interestText'],['years','yearsText']]) {
  const slider=emiForm.elements[range],text=emiForm.elements[textName];
  slider.addEventListener('input',()=>{text.value=slider.value;updateEMI();});
  text.addEventListener('input',()=>{ const min=Number(text.min),max=Number(text.max),v=Number(text.value); if(text.value!==''&&Number.isFinite(v)){slider.value=Math.min(max,Math.max(min,v));updateEMI();} else showResult($('#emi-result'),'<div class="error-state"><span>!</span><h3>Enter a valid amount.</h3><p>Values must be within the range shown beside each slider.</p></div>'); });
}
updateEMI();

const tipsForm=$('#tips-form');
tipsForm.addEventListener('submit',async event=>{
  event.preventDefault(); clearErrors(tipsForm);
  if(!validateForm(tipsForm,{income:{required:true,min:1,max:1e9},expenses:{required:true,min:0,max:1e9},debt:{required:true,min:0,max:1e9},score:{min:300,max:900,integer:true},savings:{min:0,max:1e12}})){notify('Check the highlighted fields and try again.');return;}
  const button=$('#tips-submit'),done=busy(button,'Generating your guide…');
  try { const input={income:number(tipsForm,'income'),expenses:number(tipsForm,'expenses'),debt:number(tipsForm,'debt'),score:tipsForm.elements.score.value?number(tipsForm,'score'):null,savings:number(tipsForm,'savings'),goal:tipsForm.elements.goal.value}; const r=await generateGuidance(input);
    showResult($('#tips-result'),`<div class="result-content"><div class="result-header"><div><span class="result-overline">YOUR PERSONAL MONEY GUIDE</span><h3>A clearer path, one step at a time.</h3></div><span class="result-badge ${r.mode==='AI-assisted'?'good':'review'}"><i></i>${escapeText(r.mode)}</span></div><p class="guide-summary">${escapeText(r.summary)}</p>${guideSection('Key observations',r.observations,'◉')}${guideSection('Recommended actions',r.actions,'↗')}${guideSection('Financial cautions',r.cautions,'!')}${guideSection('Next steps',r.nextSteps,'→')}<p class="result-disclaimer">✳ &nbsp;Informational guidance, not a guarantee or a substitute for a qualified adviser.</p></div>`);
    await persist('tips',{input,mode:r.mode});
  } catch(error) { showResult($('#tips-result'),`<div class="error-state"><span>!</span><h3>Your guide is taking a pause.</h3><p>${escapeText(error.message||'Please try again in a moment.')}</p></div>`); } finally { done(); }
});
function guideSection(title,items,icon){return `<h4>${title}</h4><ul class="factor-list">${(Array.isArray(items)?items:[]).map(x=>`<li class="tip-item"><i>${icon}</i>${escapeText(x)}</li>`).join('')||'<li>Review your details and try again.</li>'}</ul>`;}
function escapeText(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}

const navLinks=[...document.querySelectorAll('.nav-link')], sections=[...document.querySelectorAll('.page-section')];
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){const id=entry.target.id; navLinks.forEach(a=>a.classList.toggle('active',a.hash===`#${id}`)); const active=navLinks.find(a=>a.hash===`#${id}`);$('#page-label').textContent=active?.textContent.trim().replace('NEW','')||'Overview';}}},{rootMargin:'-20% 0px -65% 0px'});
sections.forEach(section=>observer.observe(section));
const menu=$('#sidebar'),menuButton=$('#menu-button');menuButton.addEventListener('click',()=>{const open=menu.classList.toggle('sidebar-open');menuButton.setAttribute('aria-expanded',String(open));});
navLinks.forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('sidebar-open');menuButton.setAttribute('aria-expanded','false');}));
$('#help-button').addEventListener('click',()=>document.querySelector('#about').scrollIntoView({behavior:'smooth'}));
document.querySelectorAll('form:not(#emi-form) input, form:not(#emi-form) select').forEach(input=>input.addEventListener('input',()=>{input.removeAttribute('aria-invalid'); const error=input.closest('.field')?.querySelector('.field-error');if(error)error.textContent='';}));
