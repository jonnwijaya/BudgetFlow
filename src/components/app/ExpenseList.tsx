
'use client';

import { type Expense, type CurrencyCode } from '@/types';
import ExpenseListItem from './ExpenseListItem';
import { FileText } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  currency: CurrencyCode;
}

export default function ExpenseList({ expenses, currency }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 min-h-[200px] flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">No expenses for this period.</p>
        <p>Try selecting a different month/year or add new expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 min-h-[200px]">
      {expenses.map(expense => (
        <ExpenseListItem key={expense.id} expense={expense} currency={currency} />
      ))}
    </div>
  );
}

