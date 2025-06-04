'use client';

import { type Expense } from '@/types';
import ExpenseListItem from './ExpenseListItem';

interface ExpenseListProps {
  expenses: Expense[];
}

export default function ExpenseList({ expenses }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-lg">No expenses yet.</p>
        <p>Click "Add Expense" to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {expenses.map(expense => (
        <ExpenseListItem key={expense.id} expense={expense} />
      ))}
    </div>
  );
}
