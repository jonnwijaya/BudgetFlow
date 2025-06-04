
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, PlusCircle, LogOut, UserCircle, Loader2, LogIn, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type CurrencyCode } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import DeleteAccountDialog from './DeleteAccountDialog';


interface HeaderProps {
  user: User | null; 
  onAddExpenseClick: () => void;
  totalSpent: number;
  budgetThreshold?: number | null;
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currencyCode: CurrencyCode) => void;
  currencies: ReadonlyArray<{ code: CurrencyCode; name: string; symbol: string }>;
}

export default function AppHeader({ 
  user,
  onAddExpenseClick, 
  totalSpent, 
  budgetThreshold,
  selectedCurrency,
  onCurrencyChange,
  currencies
}: HeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const budgetRemaining = budgetThreshold ? budgetThreshold - totalSpent : null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Logout Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    }
    setIsLoggingOut(false);
  };

  const handleDeleteAccount = async () => {
    // Actual deletion logic handled by Supabase Edge Function (TODO)
    console.log("TODO: Call Supabase Edge Function to delete user data for user ID:", user?.id);
    
    await supabase.auth.signOut();
    toast({
      title: "Account Deletion Initiated",
      description: "You have been logged out. Your account will be fully deleted shortly.",
      variant: "default",
    });
    router.push('/register'); // Or '/login'
    setIsDeleteDialogOpen(false);
  };


  return (
    <>
      <header className="bg-card border-b p-4 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-bold text-primary">BudgetFlow</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {user && (
              <>
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
              </>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserCircle className="h-6 w-6" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Signed in as</p>
                      <p className="text-xs leading-none text-muted-foreground truncate max-w-[200px]">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                    {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      {user && (
        <DeleteAccountDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirmDelete={handleDeleteAccount}
        />
      )}
    </>
  );
}
