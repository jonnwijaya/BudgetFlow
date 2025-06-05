
'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wallet, PlusCircle, LogOut, UserCircle, Loader2, Trash2, LogIn, UserPlus } from 'lucide-react';
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
import type { CurrencyCode } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggleButton } from './ThemeToggleButton';
import { clearLocalData } from '@/lib/localStore';

const DeleteAccountDialog = dynamic(() => import('./DeleteAccountDialog'), { ssr: false });

interface HeaderProps {
  user: User | null;
  appMode: 'guest' | 'authenticated' | 'loading';
  onAddExpenseClick: () => void;
  currentDisplaySpending: number;
  overallMonthSpending: number;
  budgetThreshold?: number | null;
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currencyCode: CurrencyCode) => void;
  currencies: ReadonlyArray<{ code: CurrencyCode; name: string; symbol: string }>;
}

export default function AppHeader({
  user,
  appMode,
  onAddExpenseClick,
  currentDisplaySpending,
  overallMonthSpending,
  budgetThreshold,
  selectedCurrency,
  onCurrencyChange,
  currencies,
}: HeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const budgetRemaining = budgetThreshold != null ? budgetThreshold - overallMonthSpending : null;

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    clearLocalData(); 

    if (error && error.message !== 'Auth session missing!') {
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
      router.replace('/login');
    }
    setIsLoggingOut(false);
  }, [router, toast]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) {
        toast({
            title: "Error",
            description: "You must be logged in to delete your account data.",
            variant: "destructive",
        });
        return;
    }
    setIsDeletingAccount(true);
    try {
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', user.id);

      if (expensesError) throw new Error(`Failed to delete expenses: ${expensesError.message}`);

      const { error: goalsError } = await supabase
        .from('savings_goals')
        .delete()
        .eq('user_id', user.id);
      
      if (goalsError) throw new Error(`Failed to delete savings goals: ${goalsError.message}`);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_deactivated: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (profileError) throw new Error(`Failed to deactivate profile: ${profileError.message}`);

      const { error: signOutError } = await supabase.auth.signOut();
      clearLocalData(); 

      if (signOutError && signOutError.message !== 'Auth session missing!') {
         toast({
          title: "Data Cleared, Logout Issue",
          description: `Your data was cleared and account deactivated, but sign out failed: ${signOutError.message}. Please try logging out manually.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Data Cleared & Deactivated",
          description: "Your application data has been cleared, and account access has been revoked. You have been signed out.",
        });
      }
      router.replace('/login');

    } catch (e: any) {
      toast({
        title: "Error During Data Deletion/Deactivation",
        description: e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteDialogOpen(false);
    }
  }, [user, router, toast]);


  return (
    <>
      <header className="bg-card border-b shadow-sm sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between py-2 sm:py-3 px-2 sm:px-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <Wallet className="h-6 w-6 sm:h-7 text-primary" />
            <Link href="/" className="text-lg sm:text-xl font-headline font-bold text-primary hover:no-underline">BudgetFlow</Link>
          </div>
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
            {(appMode === 'authenticated' || appMode === 'guest') && (
              <>
                <Select value={selectedCurrency} onValueChange={(value) => onCurrencyChange(value as CurrencyCode)}>
                  <SelectTrigger className="w-auto min-w-[40px] sm:min-w-[50px] text-xs sm:text-sm h-8 sm:h-9 px-1.5 sm:px-2">
                    <SelectValue aria-label="Selected currency">
                      {getCurrencySymbol(selectedCurrency)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(currencyItem => (
                      <SelectItem key={currencyItem.code} value={currencyItem.code}>
                        {currencyItem.code} ({currencyItem.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground hidden md:block">Spent</p> 
                  <p className="text-sm font-semibold">
                    {formatCurrency(currentDisplaySpending, selectedCurrency)}
                  </p>
                </div>

                {budgetThreshold != null && budgetRemaining != null && (
                  <div className="text-center">
                     <p className="text-xs text-muted-foreground hidden md:block">Rem.</p>
                    <p className={`text-sm font-semibold ${budgetRemaining < 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(budgetRemaining, selectedCurrency)}
                    </p>
                  </div>
                )}

                <Button
                  onClick={onAddExpenseClick}
                  variant="default"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground h-9 sm:h-10 px-2.5 sm:px-3"
                  aria-label="Add Expense"
                  size="sm"
                >
                  <PlusCircle className="h-4 w-4 sm:h-5 shrink-0 md:mr-1.5" />
                  <span className="hidden md:inline text-xs sm:text-sm">Add</span>
                </Button>
              </>
            )}

            <ThemeToggleButton />

            {appMode === 'authenticated' && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10 shrink-0" aria-label="Open user menu">
                    <UserCircle className="h-5 w-5 sm:h-6 sm:w-6" />
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
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Account Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                    {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : appMode === 'guest' ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <Button asChild variant="outline" size="sm" className="h-9 text-xs sm:text-sm px-2 sm:px-3">
                  <Link href="/login" className="flex items-center gap-1 sm:gap-1.5">
                    <LogIn className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                </Button>
                <Button asChild variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs sm:text-sm px-2 sm:px-3">
                  <Link href="/register" className="flex items-center gap-1 sm:gap-1.5">
                   <UserPlus className="h-4 w-4 shrink-0" />
                   <span className="hidden sm:inline">Sign Up</span>
                  </Link>
                </Button>
              </div>
            ) : (
              appMode === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />
            )}
          </div>
        </div>
      </header>
      {user && appMode === 'authenticated' && isDeleteDialogOpen && (
        <DeleteAccountDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirmDelete={handleDeleteAccount}
        />
      )}
    </>
  );
}
