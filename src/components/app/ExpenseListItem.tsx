
'use client';

import React from 'react';
import type { Expense, ExpenseCategory, CurrencyCode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format as formatDate, parseISO } from 'date-fns';
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

function ExpenseListItem({ expense, currency, onEdit, onDelete }: ExpenseListItemProps) {
  const Icon = categoryIcons[expense.category] || CircleDollarSign;
  const dateObject = typeof expense.date === 'string' ? parseISO(expense.date) : expense.date;

  return (
    <Card className="mb-2 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-1.5 pt-2.5 px-3 sm:pb-2 sm:pt-3 sm:px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <CardTitle className="text-sm sm:text-base font-semibold leading-tight truncate">{expense.description}</CardTitle>
          </div>
          <p className="text-base sm:text-lg font-bold text-primary whitespace-nowrap ml-2">{formatCurrency(expense.amount, currency)}</p>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2.5 sm:px-4 sm:pb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 sm:gap-2">
             <span>{expense.category}</span>
             <span aria-hidden="true" className="hidden sm:inline">&bull;</span>
             <span className="sm:hidden">|</span>
             <span>{formatDate(dateObject, 'MMM dd, yy')}</span>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => onEdit(expense)} aria-label={`Edit expense: ${expense.description}`}>
              <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)} aria-label={`Delete expense: ${expense.description}`}>
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(ExpenseListItem);
