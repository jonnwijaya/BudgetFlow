
import type { LucideIcon } from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  'Food', 'Transportation', 'Housing', 'Utilities', 'Entertainment',
  'Shopping', 'Travel', 'Healthcare', 'Education', 'Other'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  user_id: string; // Can be 'guest-user' for local data
  category: ExpenseCategory;
  date: Date;
  description: string;
  amount: number;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface Profile {
  id: string; // Supabase user ID or a guest identifier
  budget_threshold: number | null;
  selected_currency: CurrencyCode;
  is_deactivated?: boolean; // Relevant for Supabase users
  updated_at?: string;
  last_login_at?: string | null;
  login_streak_days?: number;
}

// Specific type for settings stored locally for guests or synced for users
export interface UserProfileSettings {
  budget_threshold: number | null;
  selected_currency: CurrencyCode;
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
  unlocked_at: string;
  metadata?: Record<string, any>;
}

export interface SavingsGoal {
  id: string;
  user_id: string; // Can be 'guest-user' for local data
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: Date | null;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}
