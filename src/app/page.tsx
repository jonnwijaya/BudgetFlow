
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AppHeader from '@/components/app/Header';
import AppFooter from '@/components/app/Footer';
import ExpenseList from '@/components/app/ExpenseList';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, BarChart3, CalendarDays, Loader2 } from 'lucide-react';
import type { Expense, FinancialTip, CurrencyCode, Profile, ExpenseCategory } from '@/types';
import { SUPPORTED_CURRENCIES } from '@/types';
import type { ExpenseFormData } from '@/components/app/AddExpenseSheet';
import { generateFinancialTip } from '@/ai/flows/generate-financial-tip';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import type { User, Subscription } from '@supabase/supabase-js';
import { checkAndAwardUnderBudgetMonth } from '@/lib/achievementsHelper';


// Dynamically import components
const AddExpenseSheet = dynamic(() => import('@/components/app/AddExpenseSheet'), {
  ssr: false,
  loading: () => <div className="w-full h-screen fixed inset-0 z-50 bg-black/10 backdrop-blur-sm" aria-hidden="true" /> 
});
const ExpenseChart = dynamic(() => import('@/components/app/ExpenseChart'), {
  loading: () => (
    <Card className="shadow-lg">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle><h2 className="font-headline text-base sm:text-xl">Expense Breakdown</h2></CardTitle>
        <CardDescription className="text-xs sm:text-sm">Loading chart data...</CardDescription>
      </CardHeader>
      <CardContent className="h-[200px] sm:h-[220px] md:h-[250px] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary" />
        <p className="mt-2 text-xs sm:text-sm">Loading chart...</p>
      </CardContent>
    </Card>
  ),
  ssr: false,
});
const SmartTipCard = dynamic(() => import('@/components/app/SmartTipCard'), {
  ssr: false,
  loading: () => (
     <Card className="shadow-lg">
      <CardHeader className="p-3 sm:p-4">
          <CardTitle><h2 className="font-headline text-accent text-base sm:text-xl">Smart Financial Tip</h2></CardTitle>
      </CardHeader>
      <CardContent className="h-12 sm:h-16 flex items-center justify-center">
        <Loader2 className="h-5 w-5 sm:h-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  )
});
const SetThresholdDialog = dynamic(() => import('@/components/app/SetThresholdDialog'), { ssr: false });
const DeleteExpenseDialog = dynamic(() => import('@/components/app/DeleteExpenseDialog'), { ssr: false });


export default function BudgetFlowPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authSubscription, setAuthSubscription] = useState<Subscription | null>(null);


  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);
  const [financialTip, setFinancialTip] = useState<FinancialTip | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  const [budgetThreshold, setBudgetThreshold] = useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isDeleteExpenseDialogOpen, setIsDeleteExpenseDialogOpen] = useState(false);
  const [expenseIdToDelete, setExpenseIdToDelete] = useState<string | null>(null);

  const { toast } = useToast();

 useEffect(() => {
    let isMounted = true;
    setIsLoadingAuth(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        if (!session) {
            setIsLoadingAuth(false);
        }
      }
    }).catch(error => {
      console.error("Error getting initial session:", error);
      if (isMounted) {
        setUser(null);
        setIsLoadingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setIsLoadingAuth(false);
        }
        if (event === 'SIGNED_OUT' && window.location.pathname !== '/login') {
          router.replace('/login');
        }
      }
    );
    setAuthSubscription(subscription);

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, [router]); // authSubscription removed from deps as it's set inside

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.replace('/login');
    }
  }, [isLoadingAuth, user, router]);


  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('budget_threshold, selected_currency, is_deactivated, last_login_at, login_streak_days')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No profile found
          console.log('No profile found for user, attempting to create one or using defaults.');
          // Attempt to create profile or use default if this is part of a first-login flow
          // For now, just set defaults client-side if no profile.
          // A more robust solution would create the profile server-side or on user creation.
          setBudgetThreshold(null);
          setSelectedCurrency('USD');
        } else {
          console.error('Error fetching profile:', error);
          toast({ title: 'Profile Load Error', description: `Could not load your profile: ${error.message}`, variant: 'destructive' });
        }
      } else if (data) {
        if (data.is_deactivated) {
          toast({ title: 'Account Deactivated', description: 'This account is deactivated.', variant: 'destructive'});
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }
        setBudgetThreshold(data.budget_threshold);
        setSelectedCurrency((data.selected_currency as CurrencyCode) || 'USD');
        // Profile data like last_login_at, login_streak_days are now available if needed elsewhere
      }
    } catch (e: any) {
        console.error("Unexpected error in fetchProfile:", e);
        toast({ title: 'Profile System Error', description: `An unexpected error occurred loading profile: ${e.message}`, variant: 'destructive' });
    }
  }, [toast, router]);

  const fetchExpenses = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      toast({ title: 'Expense Load Error', description: `Could not load expenses: ${error.message}`, variant: 'destructive' });
      setExpenses([]);
    } else if (data) {
      setExpenses(data.map(exp => ({ ...exp, date: parseISO(exp.date) })) as Expense[]);
    }
  }, [toast]);

  useEffect(() => {
    let isDataEffectMounted = true;
    if (!isLoadingAuth && user?.id) {
      setIsLoadingData(true);
      Promise.all([
        fetchProfile(user.id),
        fetchExpenses(user.id),
      ]).finally(() => {
        if (isDataEffectMounted) setIsLoadingData(false);
      });
    } else if (!isLoadingAuth && !user) {
      setExpenses([]);
      setBudgetThreshold(null);
      setSelectedCurrency('USD');
      setFinancialTip(null);
      if (isDataEffectMounted) setIsLoadingData(false);
    }
    return () => { isDataEffectMounted = false; };
  }, [user, isLoadingAuth, fetchProfile, fetchExpenses]);


  const availableYears = useMemo(() => {
    const yearsFromExpenses = new Set(expenses.map(exp => new Date(exp.date).getFullYear()));
    const currentYear = new Date().getFullYear();
    yearsFromExpenses.add(currentYear);
    // Add previous year and next year if not present, for easier navigation
    yearsFromExpenses.add(currentYear - 1);
    yearsFromExpenses.add(currentYear + 1);
    return Array.from(yearsFromExpenses).sort((a, b) => b - a);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budgetExceeded = budgetThreshold !== null && totalSpent > budgetThreshold;

  // Achievement Check for "Under Budget Month"
  useEffect(() => {
    if (user && !isLoadingData && budgetThreshold !== null && filteredExpenses.length > 0) { // Ensure data is loaded and there are expenses
      checkAndAwardUnderBudgetMonth(
        user,
        totalSpent,
        budgetThreshold,
        selectedMonth,
        selectedYear,
        toast
      );
    }
  }, [user, isLoadingData, filteredExpenses, totalSpent, budgetThreshold, selectedMonth, selectedYear, toast]);


  const fetchNewTip = useCallback(async () => {
    if (!user || isLoadingData || isLoadingAuth) return;
    setIsLoadingTip(true);
    try {
      const tipInput = {
        financialSituation: `User is tracking expenses. Total spent this period: ${formatCurrency(totalSpent, selectedCurrency)}. Budget: ${budgetThreshold ? formatCurrency(budgetThreshold, selectedCurrency) : 'Not set'}.`,
        riskTolerance: "Moderate",
        investmentInterests: "Saving money, budgeting effectively."
      };
      const tip = await generateFinancialTip(tipInput);
      setFinancialTip(tip);
    } catch (error) {
      console.error("Error fetching financial tip:", error);
      setFinancialTip(null);
      // toast({ title: "Tip Error", description: "Could not fetch a new financial tip.", variant: "default" }); // Toast can be noisy
    } finally {
      setIsLoadingTip(false);
    }
  }, [user, totalSpent, selectedCurrency, budgetThreshold, isLoadingData, isLoadingAuth]);

  useEffect(() => {
    if (user && !isLoadingData && !isLoadingAuth) {
      fetchNewTip();
    }
  }, [fetchNewTip, user, isLoadingData, isLoadingAuth, selectedMonth, selectedYear]); // Re-fetch tip if month/year changes

  const handleSaveExpense = useCallback(async (expenseData: ExpenseFormData) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to save an expense.", variant: "destructive" });
      return;
    }
    try {
      const formattedDate = format(expenseData.date, 'yyyy-MM-dd');
      const dataToSave = { ...expenseData, date: formattedDate, user_id: user.id };

      if (expenseToEdit) {
        const { data: updatedExpense, error } = await supabase
          .from('expenses')
          .update({ ...expenseData, date: formattedDate, updated_at: new Date().toISOString() })
          .eq('id', expenseToEdit.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        if (updatedExpense) {
          setExpenses(prevExpenses =>
            prevExpenses.map(exp =>
              exp.id === updatedExpense.id ? { ...updatedExpense, date: parseISO(updatedExpense.date) } as Expense : exp
            ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          );
          toast({ title: "Expense Updated", description: `${updatedExpense.description} successfully updated.` });
        }
        setExpenseToEdit(null);
      } else {
        const { data: savedExpense, error } = await supabase
          .from('expenses')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;

        if (savedExpense) {
          setExpenses(prevExpenses =>
            [{ ...savedExpense, date: parseISO(savedExpense.date) } as Expense, ...prevExpenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          );
          toast({ title: "Expense Added", description: `${savedExpense.description} successfully added.` });
        }
      }
    } catch (error: any) {
      console.error("Failed to save expense:", error);
      toast({ title: "Save Error", description: error.message || "Could not save expense.", variant: "destructive" });
    }
  }, [user, toast, expenseToEdit]);

  const handleEditExpenseClick = useCallback((expense: Expense) => {
    setExpenseToEdit(expense);
    setIsAddExpenseSheetOpen(true);
  }, []);

  const handleDeleteExpenseClick = useCallback((id: string) => {
    setExpenseIdToDelete(id);
    setIsDeleteExpenseDialogOpen(true);
  }, []);

  const confirmDeleteExpense = useCallback(async () => {
    if (!user || !expenseIdToDelete) {
      toast({ title: "Error", description: "User or expense ID missing.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseIdToDelete)
        .eq('user_id', user.id);

      if (error) throw error;

      setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseIdToDelete));
      toast({ title: "Expense Deleted", description: "Expense successfully deleted." });
    } catch (error: any) {
      console.error("Failed to delete expense:", error);
      toast({ title: "Delete Error", description: error.message || "Could not delete expense.", variant: "destructive" });
    } finally {
      setIsDeleteExpenseDialogOpen(false);
      setExpenseIdToDelete(null);
    }
  }, [user, expenseIdToDelete, toast]);


  const handleExportSummary = () => {
    if (filteredExpenses.length === 0) {
      toast({ title: "No Data", description: "No expenses in the selected month to export.", variant: "default" });
      return;
    }
    const headers = "ID,Date,Category,Description,Amount\n";
    const csvContent = filteredExpenses.map(e =>
      `${e.id},${format(e.date, 'yyyy-MM-dd')},${e.category},"${e.description.replace(/"/g, '""')}",${e.amount.toFixed(2)}`
    ).join("\n");
    const fullCsv = headers + csvContent;

    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `budgetflow_summary_${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: "Your expense summary for the selected month has been downloaded." });
    } else {
       toast({ title: "Export Failed", description: "Your browser does not support this feature.", variant: "destructive" });
    }
  };

  const handleSetThreshold = useCallback(async (newThreshold: number | null) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      const profileDataToUpsert: Partial<Profile> = {
        id: user.id,
        budget_threshold: newThreshold,
        // selected_currency: selectedCurrency, // Keep existing currency
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileDataToUpsert, { onConflict: 'id' }) // onConflict ensures it updates if exists, inserts if not
        .select()
        .single();

      if (error) throw error;

      setBudgetThreshold(newThreshold);
      if (newThreshold !== null) {
        toast({ title: "Budget Set", description: `Budget threshold set to ${formatCurrency(newThreshold, selectedCurrency)}.` });
      } else {
        toast({ title: "Budget Cleared", description: "Budget threshold has been removed." });
      }
    } catch (error: any) {
      console.error("Failed to set budget threshold:", error);
      toast({ title: "Update Error", description: error.message || "Could not update budget.", variant: "destructive" });
    }
  }, [user, selectedCurrency, toast]);

  const handleCurrencyChange = useCallback(async (newCurrency: CurrencyCode) => {
     if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      const profileDataToUpsert: Partial<Profile> = {
        id: user.id,
        selected_currency: newCurrency,
        // budget_threshold: budgetThreshold, // Preserve existing budget threshold
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileDataToUpsert, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      setSelectedCurrency(newCurrency);
      toast({ title: "Currency Updated", description: `Currency changed to ${newCurrency}.`})
    } catch (error: any) {
      console.error("Failed to update currency:", error);
      toast({ title: "Update Error", description: error.message || "Could not update currency.", variant: "destructive" });
    }
  }, [user, toast]);

  if (isLoadingAuth || (user && isLoadingData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading your financial data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader
        user={user}
        onAddExpenseClick={() => {
          setExpenseToEdit(null);
          setIsAddExpenseSheetOpen(true);
        }}
        totalSpent={totalSpent}
        budgetThreshold={budgetThreshold}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        currencies={SUPPORTED_CURRENCIES}
      />

      <main className="flex-grow container mx-auto p-2 xs:p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
        {budgetExceeded && (
          <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm sm:text-base">Budget Exceeded!</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              You have spent {formatCurrency(totalSpent, selectedCurrency)} for {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}, which is over your budget of {budgetThreshold ? formatCurrency(budgetThreshold, selectedCurrency) : 'N/A'}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 sm:mb-3 md:mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    <CardTitle><h2 className="font-headline text-base sm:text-lg md:text-xl">Recent Expenses</h2></CardTitle>
                  </div>
                  {user && <SetThresholdDialog currentThreshold={budgetThreshold} onSetThreshold={handleSetThreshold} currency={selectedCurrency} />}
                </div>
                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground shrink-0">
                        <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>Showing for:</span>
                    </div>
                    <div className="flex flex-row gap-2 w-full xs:w-auto">
                      <Select
                          value={selectedMonth.toString()}
                          onValueChange={(value) => setSelectedMonth(parseInt(value))}
                      >
                          <SelectTrigger className="flex-grow xs:flex-grow-0 basis-0 xs:basis-auto sm:w-[130px] h-8 xs:h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()} className="text-xs sm:text-sm">
                              {format(new Date(selectedYear, i), 'MMMM')}
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <Select
                          value={selectedYear.toString()}
                          onValueChange={(value) => setSelectedYear(parseInt(value))}
                      >
                          <SelectTrigger className="flex-grow xs:flex-grow-0 basis-0 xs:basis-auto sm:w-[100px] h-8 xs:h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                          {availableYears.map(year => (
                              <SelectItem key={year} value={year.toString()} className="text-xs sm:text-sm">
                              {year}
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-1.5 xs:p-2 sm:p-3 md:p-4 pt-0">
                 {filteredExpenses.length === 0 && !isLoadingData && !isLoadingAuth ? (
                    <div className="text-center text-muted-foreground py-4 xs:py-6 sm:py-8 min-h-[150px] sm:min-h-[200px] flex flex-col items-center justify-center">
                      <BarChart3 className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 xs:mb-3 sm:mb-4" />
                      <p className="text-xs xs:text-sm sm:text-lg font-semibold">No expenses for this period.</p>
                      <p className="text-[10px] xs:text-xs sm:text-sm">Add expenses or change the date.</p>
                    </div>
                  ) : (
                    <ExpenseList
                        expenses={filteredExpenses}
                        currency={selectedCurrency}
                        onEditExpense={handleEditExpenseClick}
                        onDeleteExpense={handleDeleteExpenseClick}
                    />
                  )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3 sm:space-y-4 md:space-y-6">
             {expenses.length === 0 && !isLoadingData && !isLoadingAuth ? (
                <Card className="shadow-lg h-[200px] xs:h-[230px] sm:h-[288px] flex items-center justify-center text-center text-muted-foreground p-3 sm:p-4">
                   <div>
                    <BarChart3 className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 xs:mb-3 sm:mb-4 mx-auto" />
                    <p className="text-xs xs:text-sm sm:text-base">Your expense chart will appear here.</p>
                   </div>
                </Card>
              ) : (
                user && <ExpenseChart expenses={filteredExpenses} currency={selectedCurrency} />
              )}
            {user && <SmartTipCard tipData={financialTip} onRefreshTip={fetchNewTip} isLoading={isLoadingTip} />}
          </div>
        </div>
      </main>

      <AppFooter onExportClick={handleExportSummary} />

      {user && isAddExpenseSheetOpen && (
        <AddExpenseSheet
          isOpen={isAddExpenseSheetOpen}
          setIsOpen={(isOpen) => {
              setIsAddExpenseSheetOpen(isOpen);
              if (!isOpen) {
                  setExpenseToEdit(null);
              }
          }}
          onSaveExpense={handleSaveExpense}
          currency={selectedCurrency}
          expenseToEdit={expenseToEdit}
        />
      )}
      {user && isDeleteExpenseDialogOpen && (
        <DeleteExpenseDialog
          isOpen={isDeleteExpenseDialogOpen}
          onOpenChange={setIsDeleteExpenseDialogOpen}
          onConfirmDelete={confirmDeleteExpense}
          itemName="this expense"
        />
      )}
    </div>
  );
}
