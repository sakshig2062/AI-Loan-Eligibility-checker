export function validateForm(form, rules) {
  let valid = true;
  for (const [name, rule] of Object.entries(rules)) {
    const input = form.elements.namedItem(name); if (!input) continue;
    const value = input.value.trim(); let message = '';
    const number = Number(value);
    if (rule.required && value === '') message = 'This field is required.';
    else if (value !== '' && !Number.isFinite(number)) message = 'Please enter a valid number.';
    else if (value !== '' && rule.min != null && number < rule.min) message = rule.minMessage || `Enter at least ${rule.min}.`;
    else if (value !== '' && rule.max != null && number > rule.max) message = rule.maxMessage || `Enter no more than ${rule.max}.`;
    else if (value !== '' && rule.integer && !Number.isInteger(number)) message = 'Please enter a whole number.';
    const error = input.closest('.field')?.querySelector('.field-error');
    if (error) { error.textContent = message; input.setAttribute('aria-invalid', message ? 'true' : 'false'); }
    if (message) valid = false;
  }
  return valid;
}
export function clearErrors(form) { form.querySelectorAll('.field-error').forEach(e => e.textContent = ''); form.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid')); }
