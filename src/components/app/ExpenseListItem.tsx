'use client';

import { type Expense, type ExpenseCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import {
  Utensils, Car, Home, Zap, Film, ShoppingBag, Plane, HeartPulse, GraduationCap, MoreHorizontal, CircleDollarSign
} from 'lucide-react';

interface ExpenseListItemProps {
  expense: Expense;
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

export default function ExpenseListItem({ expense }: ExpenseListItemProps) {
  const Icon = categoryIcons[expense.category] || CircleDollarSign;

  return (
    <Card className="mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg font-semibold">{expense.description}</CardTitle>
          </div>
          <p className="text-xl font-bold text-primary">${expense.amount.toFixed(2)}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{expense.category}</span>
          <span>{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
