'use client';

import React from 'react';
import type { Expense, ExpenseCategory, CurrencyCode } from '@/types';
import { Button } from '@/components/ui/button';
import { format as formatDate } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import {
  Utensils, Car, Home, Zap, Film, ShoppingBag, Plane, HeartPulse, GraduationCap, MoreHorizontal, CircleDollarSign, Pencil, Trash2
} from 'lucide-react';

interface ExpenseListItemProps {
  expense: Expense;
  currency: CurrencyCode;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

const categoryIcons: Record<ExpenseCategory, React.ElementType> = {
  Food: Utensils,
  Transportation: Car,
  Housing: Home,
  Utilities: Zap,
  Entertainment: Film,
  Shopping: ShoppingBag,
  Travel: Plane,
  Healthcare: HeartPulse,
  Education: GraduationCap,
  Other: MoreHorizontal,
};

const categoryColors: Record<ExpenseCategory, string> = {
  Food: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Transportation: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  Housing: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  Utilities: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  Entertainment: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  Shopping: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  Travel: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  Healthcare: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  Education: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const categoryBorderColors: Record<ExpenseCategory, string> = {
  Food: 'border-l-orange-400',
  Transportation: 'border-l-blue-400',
  Housing: 'border-l-emerald-400',
  Utilities: 'border-l-yellow-400',
  Entertainment: 'border-l-purple-400',
  Shopping: 'border-l-pink-400',
  Travel: 'border-l-cyan-400',
  Healthcare: 'border-l-red-400',
  Education: 'border-l-indigo-400',
  Other: 'border-l-gray-400',
};

function ExpenseListItem({ expense, currency, onEdit, onDelete }: ExpenseListItemProps) {
  const Icon = categoryIcons[expense.category] || CircleDollarSign;
  const dateObject = typeof expense.date === 'string' ? new Date(expense.date) : expense.date;

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 border-b last:border-b-0 bg-card hover:bg-secondary/30 transition-colors border-l-4 ${categoryBorderColors[expense.category]}`}>
      <div className={`flex items-center justify-center h-9 w-9 rounded-full shrink-0 ${categoryColors[expense.category]}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{expense.description}</p>
          <p className="text-sm font-semibold shrink-0">{formatCurrency(expense.amount, currency)}</p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{expense.category}</span>
          <span className="text-muted-foreground/40">&middot;</span>
          <span className="text-xs text-muted-foreground">{formatDate(dateObject, 'MMM dd, yyyy')}</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(expense)} aria-label={`Edit expense: ${expense.description}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)} aria-label={`Delete expense: ${expense.description}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default React.memo(ExpenseListItem);
