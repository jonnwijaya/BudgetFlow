'use client';

import React from 'react';
import type { SavingsGoal, CurrencyCode } from '@/types';
import SavingsGoalItem from './SavingsGoalItem';
import { Button } from '@/components/ui/button';
import { PiggyBank, PlusCircle } from 'lucide-react';

interface SavingsGoalListProps {
  goals: SavingsGoal[];
  currency: CurrencyCode;
  onEditGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddGoalClick: () => void;
  onAddFundsToGoal: (goal: SavingsGoal) => void;
}

function SavingsGoalList({ goals, currency, onEditGoal, onDeleteGoal, onAddGoalClick, onAddFundsToGoal }: SavingsGoalListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center min-h-[180px]">
        <PiggyBank className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">No savings goals yet.</p>
        <p className="text-xs mt-1 mb-4">Start planning for your future.</p>
        <Button onClick={onAddGoalClick} size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add First Goal
        </Button>
      </div>
    );
  }

  return (
    <div>
      {goals.map(goal => (
        <SavingsGoalItem
          key={goal.id}
          goal={goal}
          currency={currency}
          onEdit={onEditGoal}
          onDelete={onDeleteGoal}
          onAddFunds={onAddFundsToGoal}
        />
      ))}
    </div>
  );
}

export default React.memo(SavingsGoalList);
