
'use client';

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
  onAddFundsToGoal: (goal: SavingsGoal) => void; // New prop
}

export default function SavingsGoalList({ goals, currency, onEditGoal, onDeleteGoal, onAddGoalClick, onAddFundsToGoal }: SavingsGoalListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-6 sm:py-8 flex flex-col items-center justify-center border-2 border-dashed rounded-lg min-h-[150px] sm:min-h-[200px]">
        <PiggyBank className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
        <p className="text-sm sm:text-lg font-semibold">No savings goals yet.</p>
        <p className="text-xs sm:text-sm mb-3 sm:mb-4">Start planning for your future!</p>
        <Button onClick={onAddGoalClick} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-1.5 h-4 w-4" />
          Add First Goal
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {goals.map(goal => (
        <SavingsGoalItem
          key={goal.id}
          goal={goal}
          currency={currency}
          onEdit={onEditGoal}
          onDelete={onDeleteGoal}
          onAddFunds={onAddFundsToGoal} // Pass down the handler
        />
      ))}
    </div>
  );
}

