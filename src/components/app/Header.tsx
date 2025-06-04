import { Wallet, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onAddExpenseClick: () => void;
  totalSpent: number;
  budgetThreshold?: number | null;
}

export default function AppHeader({ onAddExpenseClick, totalSpent, budgetThreshold }: HeaderProps) {
  const budgetRemaining = budgetThreshold ? budgetThreshold - totalSpent : null;

  return (
    <header className="bg-card border-b p-4 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-primary">BudgetFlow</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-right">
            <p className="text-xs md:text-sm text-muted-foreground">Total Spent</p>
            <p className="text-base md:text-lg font-semibold">${totalSpent.toFixed(2)}</p>
          </div>
          {budgetThreshold !== null && budgetThreshold !== undefined && budgetRemaining !== null && (
            <div className="text-right">
              <p className="text-xs md:text-sm text-muted-foreground">Budget Rem.</p>
              <p className={`text-base md:text-lg font-semibold ${budgetRemaining < 0 ? 'text-destructive' : ''}`}>
                ${budgetRemaining.toFixed(2)}
              </p>
            </div>
          )}
          <Button 
            onClick={onAddExpenseClick} 
            variant="default" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            aria-label="Add Expense"
          >
            <PlusCircle className="h-5 w-5 shrink-0 md:mr-2" />
            <span className="hidden md:inline">Add Expense</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
