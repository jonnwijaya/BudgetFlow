
import { Wallet, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type CurrencyCode } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';

interface HeaderProps {
  onAddExpenseClick: () => void;
  totalSpent: number;
  budgetThreshold?: number | null;
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currencyCode: CurrencyCode) => void;
  currencies: ReadonlyArray<{ code: CurrencyCode; name: string; symbol: string }>;
}

export default function AppHeader({ 
  onAddExpenseClick, 
  totalSpent, 
  budgetThreshold,
  selectedCurrency,
  onCurrencyChange,
  currencies
}: HeaderProps) {
  const budgetRemaining = budgetThreshold ? budgetThreshold - totalSpent : null;

  return (
    <header className="bg-card border-b p-4 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-primary">BudgetFlow</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Select value={selectedCurrency} onValueChange={(value) => onCurrencyChange(value as CurrencyCode)}>
            <SelectTrigger className="w-[80px] md:w-[100px] text-xs md:text-sm h-9 md:h-10">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(currency => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} ({currency.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-right">
            <p className="text-xs md:text-sm text-muted-foreground">Total Spent</p>
            <p className="text-sm md:text-base font-semibold">{formatCurrency(totalSpent, selectedCurrency)}</p>
          </div>
          {budgetThreshold !== null && budgetThreshold !== undefined && budgetRemaining !== null && (
            <div className="text-right">
              <p className="text-xs md:text-sm text-muted-foreground">Budget Rem.</p>
              <p className={`text-sm md:text-base font-semibold ${budgetRemaining < 0 ? 'text-destructive' : ''}`}>
                {formatCurrency(budgetRemaining, selectedCurrency)}
              </p>
            </div>
          )}
          <Button 
            onClick={onAddExpenseClick} 
            variant="default" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            aria-label="Add Expense"
            size="sm"
          >
            <PlusCircle className="h-5 w-5 shrink-0 md:mr-2" />
            <span className="hidden md:inline">Add Expense</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
