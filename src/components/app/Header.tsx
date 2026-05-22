'use client';

import Link from 'next/link';
import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CurrencyCode } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';
import { ThemeToggleButton } from './ThemeToggleButton';

interface HeaderProps {
  onAddExpenseClick: () => void;
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currencyCode: CurrencyCode) => void;
  currencies: ReadonlyArray<{ code: CurrencyCode; name: string; symbol: string }>;
}

export default function AppHeader({
  onAddExpenseClick,
  selectedCurrency,
  onCurrencyChange,
  currencies,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="font-semibold text-lg tracking-tight">BudgetFlow</span>
        </Link>

        <div className="flex items-center gap-2">
          <Select value={selectedCurrency} onValueChange={(value) => onCurrencyChange(value as CurrencyCode)}>
            <SelectTrigger className="h-9 w-[72px] text-xs font-medium border-dashed">
              <SelectValue>
                {getCurrencySymbol(selectedCurrency)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-xs">
                  {c.code} ({c.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ThemeToggleButton />

          <Button
            onClick={onAddExpenseClick}
            size="sm"
            className="h-9 gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-medium">Add</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
