'use client';

import React from 'react';
import type { Expense, CurrencyCode, ExpenseCategory } from '@/types';
import ExpenseListItem from './ExpenseListItem';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface ExpenseListProps {
  expenses: Expense[];
  currency: CurrencyCode;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  selectedPieCategory: ExpenseCategory | null;
  onClearPieCategoryFilter: () => void;
  totalFilteredExpenses: number;
}

function ExpenseList({
  expenses,
  currency,
  onEditExpense,
  onDeleteExpense,
  selectedPieCategory,
  onClearPieCategoryFilter,
  totalFilteredExpenses
}: ExpenseListProps) {
  if (expenses.length === 0) {
    if (selectedPieCategory) {
      return (
        <div className="text-center text-muted-foreground py-10 min-h-[200px] flex flex-col items-center justify-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No expenses for "{selectedPieCategory}".</p>
          <Button variant="link" onClick={onClearPieCategoryFilter} className="mt-1 h-8 text-xs">
            <X className="mr-1 h-3.5 w-3.5" /> Clear filter
          </Button>
        </div>
      );
    }
    return (
      <div className="text-center text-muted-foreground py-10 min-h-[200px] flex flex-col items-center justify-center">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">No expenses for this period.</p>
        <p className="text-xs mt-1">Try selecting a different month or add new expenses.</p>
      </div>
    );
  }

  return (
    <div>
      {selectedPieCategory && (
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b">
          <p className="text-xs font-medium">
            Filtered by <span className="text-primary">{selectedPieCategory}</span>
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium">{formatCurrency(totalFilteredExpenses, currency)}</p>
            <Button variant="ghost" size="sm" onClick={onClearPieCategoryFilter} className="h-6 text-xs px-2">
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          </div>
        </div>
      )}
      {expenses.map(expense => (
        <ExpenseListItem
          key={expense.id}
          expense={expense}
          currency={currency}
          onEdit={onEditExpense}
          onDelete={onDeleteExpense}
        />
      ))}
    </div>
  );
}

export default React.memo(ExpenseList);
