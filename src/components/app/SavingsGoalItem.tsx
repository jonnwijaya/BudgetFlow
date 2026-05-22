'use client';

import React from 'react';
import type { SavingsGoal, CurrencyCode } from '@/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format as formatDate } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Target, Pencil, Trash2, CalendarDays, PlusCircle, CheckCircle2 } from 'lucide-react';

interface SavingsGoalItemProps {
  goal: SavingsGoal;
  currency: CurrencyCode;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goalId: string) => void;
  onAddFunds: (goal: SavingsGoal) => void;
}

function SavingsGoalItem({ goal, currency, onEdit, onDelete, onAddFunds }: SavingsGoalItemProps) {
  const progressPercentage = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
  const targetDateObject = goal.target_date ? (typeof goal.target_date === 'string' ? new Date(goal.target_date) : goal.target_date) : null;
  const isGoalMet = goal.current_amount >= goal.target_amount;

  return (
    <div className="group px-4 py-3 border-b last:border-b-0 bg-card hover:bg-secondary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`flex items-center justify-center h-9 w-9 rounded-full shrink-0 ${isGoalMet ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary/10 text-primary'}`}>
            {isGoalMet ? <CheckCircle2 className="h-4 w-4" /> : <Target className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{goal.goal_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold ${isGoalMet ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                {formatCurrency(goal.current_amount, currency)}
              </span>
              <span className="text-xs text-muted-foreground">/ {formatCurrency(goal.target_amount, currency)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {!isGoalMet && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => onAddFunds(goal)} aria-label={`Add funds to ${goal.goal_name}`}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(goal)} aria-label={`Edit ${goal.goal_name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(goal.id)} aria-label={`Delete ${goal.goal_name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="flex items-center justify-between mb-1">
          <Progress value={progressPercentage} className="h-1.5 flex-1" />
          <span className="text-[10px] font-medium text-muted-foreground ml-2 w-8 text-right">{Math.round(progressPercentage)}%</span>
        </div>
        {targetDateObject && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarDays className="h-2.5 w-2.5" />
            <span>Target: {formatDate(targetDateObject, 'MMM dd, yyyy')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(SavingsGoalItem);
