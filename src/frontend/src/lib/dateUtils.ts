import { Currency } from '../backend';

/**
 * Format a date based on currency preference
 * EUR: DD/MM/YYYY
 * USD: MM/DD/YYYY
 */
export function formatDateByCurrency(date: Date, currency: Currency): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  if (currency === Currency.eur) {
    return `${day}/${month}/${year}`;
  } else {
    return `${month}/${day}/${year}`;
  }
}
