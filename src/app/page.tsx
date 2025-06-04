
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/app/Header';
import AppFooter from '@/components/app/Footer';
import AddExpenseSheet from '@/components/app/AddExpenseSheet';
import ExpenseList from '@/components/app/ExpenseList';
import ExpenseChart from '@/components/app/ExpenseChart';
import SmartTipCard from '@/components/app/SmartTipCard';
import SetThresholdDialog from '@/components/app/SetThresholdDialog';
import DeleteExpenseDialog from '@/components/app/DeleteExpenseDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, BarChart3, CalendarDays, Loader2 } from 'lucide-react';
import type { Expense, FinancialTip, CurrencyCode, Profile, ExpenseCategory } from '@/types';
import { SUPPORTED_CURRENCIES } from '@/types'; // Added import
import type { ExpenseFormData } from '@/components/app/AddExpenseSheet'; // Import form data type
import { generateFinancialTip } from '@/ai/flows/generate-financial-tip';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import type { User, Subscription } from '@supabase/supabase-js';

export default function BudgetFlowPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
    let authSub: Subscription | null = null;
    setIsLoadingAuth(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null);
         // Defer setIsLoadingAuth to false until the listener confirms INITIAL_SESSION or other relevant event
      }
    }).catch(error => {
      if (isMounted) {
        console.error("Error fetching initial session:", error);
        setIsLoadingAuth(false); // Critical to set false on error
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authSub = subscription;
      if (isMounted) {
        setUser(session?.user ?? null);
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_DELETED") {
           setIsLoadingAuth(false);
        }
      }
    });

    return () => {
      isMounted = false;
      authSub?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.replace('/login');
    }
  }, [isLoadingAuth, user, router]);


  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('budget_threshold, selected_currency, is_deactivated')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // "No rows found" - Profile doesn't exist for this user yet
          console.log('No profile found for user, using default values.');
          setBudgetThreshold(null); // Or a default budget if you prefer
          setSelectedCurrency('USD'); // Default currency
          // No need to toast for this specific error, as it's a normal case for new users
        } else {
          // Handle other unexpected errors
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
      // Reset data if user logs out
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
      toast({ title: "Tip Error", description: "Could not fetch a new financial tip.", variant: "default" });
    } finally {
      setIsLoadingTip(false);
    }
  }, [user, totalSpent, selectedCurrency, budgetThreshold, isLoadingData, isLoadingAuth, toast]);

  useEffect(() => {
    if (user && !isLoadingData && !isLoadingAuth) {
      fetchNewTip();
    }
  }, [fetchNewTip, user, isLoadingData, isLoadingAuth]);

  const handleSaveExpense = async (expenseData: ExpenseFormData) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to save an expense.", variant: "destructive" });
      return;
    }
    try {
      const formattedDate = format(expenseData.date, 'yyyy-MM-dd');
      const dataToSave = { ...expenseData, date: formattedDate, user_id: user.id };

      if (expenseToEdit) { // UPDATE existing expense
        const { data: updatedExpense, error } = await supabase
          .from('expenses')
          .update({ ...expenseData, date: formattedDate, updated_at: new Date().toISOString() }) // user_id is not changed, it's part of .eq
          .eq('id', expenseToEdit.id)
          .eq('user_id', user.id) // Security: ensure user owns the expense
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
        setExpenseToEdit(null); // Clear edit mode
      } else { // INSERT new expense
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
  };

  const handleEditExpenseClick = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsAddExpenseSheetOpen(true);
  };

  const handleDeleteExpenseClick = (id: string) => {
    setExpenseIdToDelete(id);
    setIsDeleteExpenseDialogOpen(true);
  };

  const confirmDeleteExpense = async () => {
    if (!user || !expenseIdToDelete) {
      toast({ title: "Error", description: "User or expense ID missing.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseIdToDelete)
        .eq('user_id', user.id); // Security: ensure user owns the expense

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
  };


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

  const handleSetThreshold = async (newThreshold: number | null) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      const profileDataToUpsert: Partial<Profile> = { 
        id: user.id, 
        budget_threshold: newThreshold,
        selected_currency: selectedCurrency, 
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileDataToUpsert, { onConflict: 'id' })
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
  };

  const handleCurrencyChange = async (newCurrency: CurrencyCode) => {
     if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      const profileDataToUpsert: Partial<Profile> = {
        id: user.id,
        selected_currency: newCurrency,
        budget_threshold: budgetThreshold, // Preserve existing budget threshold
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
  };

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
          setExpenseToEdit(null); // Ensure not in edit mode when clicking general add
          setIsAddExpenseSheetOpen(true);
        }}
        totalSpent={totalSpent}
        budgetThreshold={budgetThreshold}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        currencies={SUPPORTED_CURRENCIES}
      />

      <main className="flex-grow container mx-auto p-4 md:p-6 space-y-6">
        {budgetExceeded && (
          <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Budget Exceeded!</AlertTitle>
            <AlertDescription>
              You have spent {formatCurrency(totalSpent, selectedCurrency)} for {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}, which is over your budget of {budgetThreshold ? formatCurrency(budgetThreshold, selectedCurrency) : 'N/A'}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-primary" />
                    <CardTitle className="font-headline">Recent Expenses</CardTitle>
                  </div>
                  <SetThresholdDialog currentThreshold={budgetThreshold} onSetThreshold={handleSetThreshold} currency={selectedCurrency} />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <span>Showing expenses for:</span>
                    </div>
                    <div className="flex gap-2">
                    <Select
                        value={selectedMonth.toString()}
                        onValueChange={(value) => setSelectedMonth(parseInt(value))}
                    >
                        <SelectTrigger className="w-full sm:w-[130px] h-9">
                        <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                            {format(new Date(selectedYear, i), 'MMMM')}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                        <SelectTrigger className="w-full sm:w-[100px] h-9">
                        <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>
                            {year}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                 {filteredExpenses.length === 0 && !isLoadingData && !isLoadingAuth ? (
                    <div className="text-center text-muted-foreground py-8 min-h-[200px] flex flex-col items-center justify-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold">No expenses for this period.</p>
                      <p>Try selecting a different month/year or add new expenses.</p>
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

          <div className="space-y-6">
             {expenses.length === 0 && !isLoadingData && !isLoadingAuth ? (
                <Card className="shadow-lg h-[388px] flex items-center justify-center text-center text-muted-foreground p-4">
                   <div>
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                    <p>Your expense chart will appear here once you add some expenses.</p>
                   </div>
                </Card>
              ) : (
                <ExpenseChart expenses={filteredExpenses} currency={selectedCurrency} />
              )}
            <SmartTipCard tipData={financialTip} onRefreshTip={fetchNewTip} isLoading={isLoadingTip} />
          </div>
        </div>
      </main>

      <AppFooter onExportClick={handleExportSummary} />

      <AddExpenseSheet
        isOpen={isAddExpenseSheetOpen}
        setIsOpen={(isOpen) => {
            setIsAddExpenseSheetOpen(isOpen);
            if (!isOpen) {
                setExpenseToEdit(null); // Clear edit mode when sheet is closed
            }
        }}
        onSaveExpense={handleSaveExpense}
        currency={selectedCurrency}
        expenseToEdit={expenseToEdit}
      />
      <DeleteExpenseDialog
        isOpen={isDeleteExpenseDialogOpen}
        onOpenChange={setIsDeleteExpenseDialogOpen}
        onConfirmDelete={confirmDeleteExpense}
        itemName="this expense"
      />
    </div>
  );
}
