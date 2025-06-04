
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
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0"> {/* Added min-w-0 for truncation */}
            <Icon className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base font-semibold leading-tight truncate">{expense.description}</CardTitle> {/* Added truncate */}
          </div>
          <p className="text-lg font-bold text-primary whitespace-nowrap ml-2">{formatCurrency(expense.amount, currency)}</p> {/* Added ml-2 for spacing */}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
             <span>{expense.category}</span>
             <span aria-hidden="true">&bull;</span>
             <span>{formatDate(dateObject, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(expense)} aria-label={`Edit expense: ${expense.description}`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)} aria-label={`Delete expense: ${expense.description}`}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(ExpenseListItem);
