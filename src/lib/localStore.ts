
'use client';

import type { Expense, SavingsGoal, UserProfileSettings, CurrencyCode, ExpenseCategory } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';
import { parse, parseISO, isValid, isDate } from 'date-fns';

const GUEST_USER_ID = 'guest-user';
const PROFILE_SETTINGS_KEY = 'budgetflow_profileSettings';
const EXPENSES_KEY = 'budgetflow_expenses';
const SAVINGS_GOALS_KEY = 'budgetflow_savingsGoals';

// Helper to generate unique IDs
export function generateId(): string {
  return crypto.randomUUID();
}

// --- Profile Settings ---
export function getLocalProfileSettings(): UserProfileSettings {
  if (typeof window === 'undefined') return { budget_threshold: null, selected_currency: 'USD' };
  const storedSettings = localStorage.getItem(PROFILE_SETTINGS_KEY);
  if (storedSettings) {
    return JSON.parse(storedSettings);
  }
  return { budget_threshold: null, selected_currency: 'USD' }; // Default settings
}

export function saveLocalProfileSettings(settings: UserProfileSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(settings));
}

// --- Expenses ---
function deserializeExpenses(expenses: Expense[]): Expense[] {
  return expenses.map(exp => ({
    ...exp,
    date: typeof exp.date === 'string' ? parseISO(exp.date) : exp.date,
  })).filter(exp => exp.date && (isDate(exp.date) && isValid(exp.date)));
}

export function getLocalExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  const storedExpenses = localStorage.getItem(EXPENSES_KEY);
  return storedExpenses ? deserializeExpenses(JSON.parse(storedExpenses)) : [];
}

export function saveLocalExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function addLocalExpense(newExpenseData: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Expense {
  const expenses = getLocalExpenses();
  const now = new Date().toISOString();
  const newExpense: Expense = {
    ...newExpenseData,
    id: generateId(),
    user_id: GUEST_USER_ID,
    created_at: now,
    updated_at: now,
  };
  const updatedExpenses = [newExpense, ...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveLocalExpenses(updatedExpenses);
  return newExpense;
}

export function addMultipleLocalExpenses(newExpensesData: Array<Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Expense[] {
  if (typeof window === 'undefined') return [];
  const existingExpenses = getLocalExpenses();
  const now = new Date().toISOString();
  
  const newCompleteExpenses: Expense[] = newExpensesData.map(expData => ({
    ...expData,
    id: generateId(),
    user_id: GUEST_USER_ID,
    created_at: now,
    updated_at: now,
  }));

  const updatedExpenses = [...newCompleteExpenses, ...existingExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveLocalExpenses(updatedExpenses);
  return newCompleteExpenses; // Return only the newly added ones, consistent with single add
}


export function updateLocalExpense(updatedExpenseData: Expense): Expense | null {
  let expenses = getLocalExpenses();
  const index = expenses.findIndex(exp => exp.id === updatedExpenseData.id);
  if (index !== -1) {
    expenses[index] = { ...updatedExpenseData, updated_at: new Date().toISOString() };
    saveLocalExpenses(expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return expenses[index];
  }
  return null;
}

export function deleteLocalExpense(expenseId: string): void {
  let expenses = getLocalExpenses();
  expenses = expenses.filter(exp => exp.id !== expenseId);
  saveLocalExpenses(expenses);
}

// --- Savings Goals ---
function deserializeSavingsGoals(goals: SavingsGoal[]): SavingsGoal[] {
    return goals.map(goal => ({
      ...goal,
      target_date: goal.target_date && typeof goal.target_date === 'string' ? parseISO(goal.target_date) : goal.target_date,
    })).filter(goal => goal.target_date === null || (goal.target_date && isDate(goal.target_date) && isValid(goal.target_date)));
}

export function getLocalSavingsGoals(): SavingsGoal[] {
  if (typeof window === 'undefined') return [];
  const storedGoals = localStorage.getItem(SAVINGS_GOALS_KEY);
  return storedGoals ? deserializeSavingsGoals(JSON.parse(storedGoals)) : [];
}

export function saveLocalSavingsGoals(goals: SavingsGoal[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(goals));
}

export function addLocalSavingsGoal(newGoalData: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): SavingsGoal {
  const goals = getLocalSavingsGoals();
  const now = new Date().toISOString();
  const newGoal: SavingsGoal = {
    ...newGoalData,
    id: generateId(),
    user_id: GUEST_USER_ID,
    created_at: now,
    updated_at: now,
  };
  const updatedGoals = [...goals, newGoal].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  saveLocalSavingsGoals(updatedGoals);
  return newGoal;
}

export function updateLocalSavingsGoal(updatedGoalData: SavingsGoal): SavingsGoal | null {
  let goals = getLocalSavingsGoals();
  const index = goals.findIndex(g => g.id === updatedGoalData.id);
  if (index !== -1) {
    goals[index] = { ...updatedGoalData, updated_at: new Date().toISOString() };
    saveLocalSavingsGoals(goals.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    return goals[index];
  }
  return null;
}

export function deleteLocalSavingsGoal(goalId: string): void {
  let goals = getLocalSavingsGoals();
  goals = goals.filter(g => g.id !== goalId);
  saveLocalSavingsGoals(goals);
}

export function clearLocalData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROFILE_SETTINGS_KEY);
  localStorage.removeItem(EXPENSES_KEY);
  localStorage.removeItem(SAVINGS_GOALS_KEY);
}
