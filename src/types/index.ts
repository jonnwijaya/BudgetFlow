export const EXPENSE_CATEGORIES = [
  'Food', 'Transportation', 'Housing', 'Utilities', 'Entertainment',
  'Shopping', 'Travel', 'Healthcare', 'Education', 'Other'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  category: ExpenseCategory;
  date: Date;
  description: string;
  amount: number;
}

export interface FinancialTip {
  tip: string;
  reasoning: string;
}
