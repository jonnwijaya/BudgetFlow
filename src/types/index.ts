
export const EXPENSE_CATEGORIES = [
  'Food', 'Transportation', 'Housing', 'Utilities', 'Entertainment',
  'Shopping', 'Travel', 'Healthcare', 'Education', 'Other'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string; // Will be UUID from Supabase
  user_id: string; // Foreign key, explicitly not optional as it's crucial
  category: ExpenseCategory;
  date: Date; // Stored as DATE in DB, handled as Date object in JS
  description: string;
  amount: number;
  created_at: string; // Timestamptz from Supabase, explicitly not optional
  updated_at: string; // Timestamptz from Supabase, explicitly not optional
}

export interface Profile {
  id: string; // UUID, matches auth.users.id
  budget_threshold: number | null;
  selected_currency: CurrencyCode;
  is_deactivated: boolean; 
  updated_at?: string;
}

export interface FinancialTip {
  tip: string;
  reasoning: string;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];
