export const EXPENSE_CATEGORIES = [
  'Food', 'Transportation', 'Housing', 'Utilities', 'Entertainment',
  'Shopping', 'Travel', 'Healthcare', 'Education', 'Other'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  user_id: string;
  category: ExpenseCategory;
  date: Date;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfileSettings {
  budget_threshold: number | null;
  selected_currency: CurrencyCode;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

export interface SavingsGoal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: Date | null;
  created_at: string;
  updated_at: string;
}
