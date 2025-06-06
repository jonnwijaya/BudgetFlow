
'use client';

import React from 'react';
import type { Expense, CurrencyCode, ExpenseCategory } from '@/types';
import ExpenseListItem from './ExpenseListItem';
import { FileText, FilterX } from 'lucide-react';
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
        <div className="text-center text-muted-foreground py-8 min-h-[200px] flex flex-col items-center justify-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold">No expenses for "{selectedPieCategory}".</p>
          <Button variant="link" onClick={onClearPieCategoryFilter} className="mt-2 text-primary">
            <FilterX className="mr-2 h-4 w-4" /> Clear filter
          </Button>
        </div>
      );
    }
    return (
      <div className="text-center text-muted-foreground py-8 min-h-[200px] flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">No expenses for this period.</p>
        <p className="text-sm">Try selecting a different month/year or add new expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 min-h-[200px]">
      {selectedPieCategory && (
        <div className="flex justify-between items-center p-2 mb-2 border-b">
          <p className="text-sm font-semibold">
            Showing expenses for: <span className="text-primary">{selectedPieCategory}</span>
          </p>
           <p className="text-sm font-semibold">
            Total: <span className="text-primary">{formatCurrency(totalFilteredExpenses, currency)}</span>
          </p>
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
