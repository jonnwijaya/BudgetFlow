
'use client';

import type { Expense, ExpenseCategory, UserProfileSettings } from '@/types';
import { getLocalProfileSettings, saveLocalProfileSettings, getLocalExpenses, saveLocalExpenses, generateId } from './localStore';
import { subDays, formatISO } from 'date-fns';

const GUEST_USER_ID = 'guest-user';

export function generateSampleExpenses(): Expense[] {
  const today = new Date();
  const now = formatISO(today);

  return [
    {
      id: generateId(),
      user_id: GUEST_USER_ID,
      description: 'Groceries for the week',
      amount: 75.50,
      category: 'Food',
      date: subDays(today, 2),
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      user_id: GUEST_USER_ID,
      description: 'Monthly Metro Pass',
      amount: 120.00,
      category: 'Transportation',
      date: subDays(today, 5),
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      user_id: GUEST_USER_ID,
      description: 'Dinner with friends',
      amount: 45.00,
      category: 'Food',
      date: subDays(today, 1),
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      user_id: GUEST_USER_ID,
      description: 'New T-shirt',
      amount: 25.00,
      category: 'Shopping',
      date: subDays(today, 10),
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      user_id: GUEST_USER_ID,
      description: 'Electricity Bill',
      amount: 60.25,
      category: 'Utilities',
      date: subDays(today, 15),
      created_at: now,
      updated_at: now,
    },
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getDefaultProfileSettings(): UserProfileSettings {
  return {
    selected_currency: 'USD',
    budget_threshold: null,
  };
}

export function initializeLocalDataIfNotExists(): void {
  if (typeof window === 'undefined') return;

  // Check if profile settings exist; if not, it's likely a first-time guest
  const existingSettings = localStorage.getItem('budgetflow_profileSettings'); // Use actual key

  if (!existingSettings) {
    console.log("BudgetFlow: Initializing local data for new guest user.");
    const defaultSettings = getDefaultProfileSettings();
    saveLocalProfileSettings(defaultSettings);

    const sampleExpenses = generateSampleExpenses();
    saveLocalExpenses(sampleExpenses);
    // No sample savings goals for now to keep it simple
    localStorage.setItem('budgetflow_savingsGoals', JSON.stringify([])); // Use actual key
  }
}
