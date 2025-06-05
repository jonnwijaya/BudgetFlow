
import type { LucideIcon } from 'lucide-react';

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
  // recurring_expense_id and is_auto_generated are removed as they relate to recurring expenses
}

export interface Profile {
  id: string; 
  budget_threshold: number | null;
  selected_currency: CurrencyCode;
  is_deactivated: boolean; 
  updated_at?: string;
  last_login_at?: string | null; // ISO string
  login_streak_days?: number;
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

// Achievements
export const ACHIEVEMENT_KEYS = {
  LOGIN_STREAK_7_DAYS: 'LOGIN_STREAK_7_DAYS',
  UNDER_BUDGET_ONE_MONTH: 'UNDER_BUDGET_ONE_MONTH',
} as const;

export type AchievementKey = typeof ACHIEVEMENT_KEYS[keyof typeof ACHIEVEMENT_KEYS];

export interface Achievement {
  key: AchievementKey;
  name: string;
  description: string;
  icon: LucideIcon; 
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_key: AchievementKey;
  unlocked_at: string; // ISO string
  metadata?: Record<string, any>;
}

// Savings Goals
export interface SavingsGoal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: Date | null; // Can be string from DB, convert to Date
  created_at: string;
  updated_at: string;
}
