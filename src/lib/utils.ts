import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency ? currency.symbol : '$'; // Default to $
}

export function formatCurrency(amount: number, currencyCode: CurrencyCode): string {
  const symbol = getCurrencySymbol(currencyCode);
  // For more robust internationalization, consider Intl.NumberFormat
  // For example:
  // try {
  //   return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
  // } catch (e) {
  //   // Fallback for unsupported currency codes by Intl.NumberFormat or if it errors
  //   return `${symbol}${amount.toFixed(2)}`;
  // }
  return `${symbol}${amount.toFixed(2)}`;
}
