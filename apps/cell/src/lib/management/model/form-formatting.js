export function formatFormValue(field, value, options = {}) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return options.emptyValue ?? '';
  if (['select', 'radio', 'button-select'].includes(field.type)) return field.options?.find((option) => option.value === value)?.label ?? '';
  if (['checkbox', 'button-multi-select'].includes(field.type)) return value.map((entry) => field.options?.find((option) => option.value === entry)?.label ?? '').filter(Boolean).join(', ');
  if (field.type === 'money') return new Intl.NumberFormat(options.locale || 'en-US', { style: 'currency', currency: options.currency || 'USD' }).format(Number(value));
  if (field.type === 'percent') return `${Number(value).toLocaleString(options.locale || 'en-US')}%`;
  if (field.type === 'date') return new Intl.DateTimeFormat(options.locale || 'en-US', { timeZone: options.timeZone || 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  if (field.type === 'datetime') return new Intl.DateTimeFormat(options.locale || 'en-US', { dateStyle: 'short', timeStyle: 'short', timeZone: options.timeZone || 'UTC' }).format(new Date(value));
  return String(value);
}
