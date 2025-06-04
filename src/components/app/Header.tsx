
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Wallet, PlusCircle, LogOut, UserCircle, Loader2, Trash2 } from 'lucide-react';
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

const DeleteAccountDialog = dynamic(() => import('./DeleteAccountDialog'), { ssr: false });

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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const budgetRemaining = budgetThreshold ? budgetThreshold - totalSpent : null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();

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
  };

  const handleDeleteAccount = async () => {
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

      if (expensesError) {
        console.error("Error deleting user's expenses:", expensesError);
        throw new Error(`Failed to delete expenses: ${expensesError.message}`);
      }
      console.log("User's expenses deleted.");

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_deactivated: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      
      if (profileError) {
        console.error("Error deactivating user's profile:", profileError);
        throw new Error(`Failed to deactivate profile: ${profileError.message}`);
      }
      console.log("User's profile deactivated.");
      
      const { error: signOutError } = await supabase.auth.signOut();

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
          variant: "default",
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
                  <SelectTrigger className="w-[70px] md:w-[100px] text-xs md:text-sm h-9 md:h-10">
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
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground sm:hidden">Spent</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Total Spent</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(totalSpent, selectedCurrency)}
                  </p>
                </div>

                {budgetThreshold !== null && budgetThreshold !== undefined && budgetRemaining !== null && (
                  <div className="text-center">
                     <p className="text-xs text-muted-foreground sm:hidden">Rem.</p>
                     <p className="text-xs text-muted-foreground hidden sm:block">Budget Rem.</p>
                    <p className={`text-sm font-semibold ${budgetRemaining < 0 ? 'text-destructive' : ''}`}>
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
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open user menu">
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
            ) : (
               null
            )}
          </div>
        </div>
      </header>
      {user && isDeleteDialogOpen && (
        <DeleteAccountDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirmDelete={handleDeleteAccount}
        />
      )}
    </>
  );
}
