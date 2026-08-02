export const CURRENCY_CODE = 'NGN'
export const CURRENCY_LOCALE = 'en-NG'
const formatter = new Intl.NumberFormat(CURRENCY_LOCALE, { style: 'currency', currency: CURRENCY_CODE, minimumFractionDigits: 2 })
export function formatCurrency(value, fallback = formatter.format(0)) { if (value === null || value === undefined || value === '') return fallback; const number=Number(value); return Number.isFinite(number)?formatter.format(number):fallback }
export function parseCurrencyInput(value) { if (value === null || value === undefined || value === '') return null; const number=Number(String(value).replace(/[^0-9.-]/g,'')); return Number.isFinite(number)?number:null }
