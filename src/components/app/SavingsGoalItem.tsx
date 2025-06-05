
'use client';

import React from 'react';
import type { SavingsGoal, CurrencyCode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format as formatDate, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Target, Pencil, Trash2, CalendarDays } from 'lucide-react';

interface SavingsGoalItemProps {
  goal: SavingsGoal;
  currency: CurrencyCode;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goalId: string) => void;
}

function SavingsGoalItem({ goal, currency, onEdit, onDelete }: SavingsGoalItemProps) {
  const progressPercentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  const targetDateObject = goal.target_date ? (typeof goal.target_date === 'string' ? parseISO(goal.target_date) : goal.target_date) : null;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2 pt-3 px-3 sm:pb-3 sm:pt-4 sm:px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base sm:text-lg font-semibold leading-tight truncate">{goal.goal_name}</CardTitle>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)} aria-label={`Edit goal: ${goal.goal_name}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(goal.id)} aria-label={`Delete goal: ${goal.goal_name}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-2">
        <Progress value={progressPercentage} aria-label={`${progressPercentage.toFixed(0)}% progress towards ${goal.goal_name}`} className="h-3 sm:h-4" />
        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center text-xs sm:text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">{formatCurrency(goal.current_amount, currency)}</span> / {formatCurrency(goal.target_amount, currency)}
          </p>
          {targetDateObject && (
            <div className="flex items-center gap-1 mt-1 xs:mt-0">
              <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Target: {formatDate(targetDateObject, 'MMM dd, yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(SavingsGoalItem);
