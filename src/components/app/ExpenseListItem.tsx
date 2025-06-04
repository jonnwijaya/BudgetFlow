
'use client';

import { type Expense, type ExpenseCategory, type CurrencyCode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format as formatDate, parseISO } from 'date-fns'; // Import parseISO
import { formatCurrency } from '@/lib/utils';
import {
  Utensils, Car, Home, Zap, Film, ShoppingBag, Plane, HeartPulse, GraduationCap, MoreHorizontal, CircleDollarSign
} from 'lucide-react';

interface ExpenseListItemProps {
  expense: Expense;
  currency: CurrencyCode;
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

export default function ExpenseListItem({ expense, currency }: ExpenseListItemProps) {
  const Icon = categoryIcons[expense.category] || CircleDollarSign;

  // Ensure expense.date is a Date object. Supabase might return it as a string.
  const dateObject = typeof expense.date === 'string' ? parseISO(expense.date) : expense.date;

  return (
    <Card className="mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg font-semibold">{expense.description}</CardTitle>
          </div>
          <p className="text-xl font-bold text-primary">{formatCurrency(expense.amount, currency)}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{expense.category}</span>
          {/* Format the dateObject */}
          <span>{formatDate(dateObject, 'MMM dd, yyyy')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
