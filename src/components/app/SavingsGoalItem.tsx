
'use client';

import React from 'react';
import type { SavingsGoal, CurrencyCode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format as formatDate, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Target, Pencil, Trash2, CalendarDays, PlusCircle } from 'lucide-react';

interface SavingsGoalItemProps {
  goal: SavingsGoal;
  currency: CurrencyCode;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goalId: string) => void;
  onAddFunds: (goal: SavingsGoal) => void;
}

function SavingsGoalItem({ goal, currency, onEdit, onDelete, onAddFunds }: SavingsGoalItemProps) {
  const progressPercentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  const targetDateObject = goal.target_date ? (typeof goal.target_date === 'string' ? parseISO(goal.target_date) : goal.target_date) : null;
  const isGoalMet = goal.current_amount >= goal.target_amount;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-1.5 pt-2.5 px-3 sm:pb-2 sm:pt-3 sm:px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Target className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${isGoalMet ? 'text-green-500' : 'text-primary'}`} />
            <CardTitle className="text-sm sm:text-base font-semibold leading-tight truncate">{goal.goal_name}</CardTitle>
          </div>
          <div className="flex items-center">
             {!isGoalMet && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 sm:h-7 sm:w-7 mr-0.5 sm:mr-1 text-primary hover:text-primary" 
                onClick={() => onAddFunds(goal)} 
                aria-label={`Add funds to goal: ${goal.goal_name}`}
              >
                <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => onEdit(goal)} aria-label={`Edit goal: ${goal.goal_name}`}>
              <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:text-destructive" onClick={() => onDelete(goal.id)} aria-label={`Delete goal: ${goal.goal_name}`}>
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2.5 sm:px-4 sm:pb-3 space-y-1.5 sm:space-y-2">
        <Progress value={progressPercentage} aria-label={`${progressPercentage.toFixed(0)}% progress towards ${goal.goal_name}`} className="h-2.5 sm:h-3" />
        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center text-xs text-muted-foreground">
          <p className="text-xs sm:text-sm">
            <span className={`font-medium ${isGoalMet ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>{formatCurrency(goal.current_amount, currency)}</span> / {formatCurrency(goal.target_amount, currency)}
          </p>
          {targetDateObject && (
            <div className="flex items-center gap-1 mt-0.5 xs:mt-0 text-[10px] sm:text-xs">
              <CalendarDays className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span>Target: {formatDate(targetDateObject, 'MMM dd, yy')}</span>
            </div>
          )}
        </div>
         {isGoalMet && (
          <p className="text-xs text-center font-semibold text-green-600 dark:text-green-400 mt-1">Goal Achieved! 🎉</p>
        )}
      </CardContent>
    </Card>
  );
}

export default React.memo(SavingsGoalItem);
