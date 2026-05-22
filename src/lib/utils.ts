import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency ? currency.symbol : '$';
}

export function formatCurrency(amount: number, currencyCode: CurrencyCode): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toFixed(2)}`;
  }
}
