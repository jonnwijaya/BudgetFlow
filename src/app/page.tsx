
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AppHeader from '@/components/app/Header';
import AppFooter from '@/components/app/Footer';
import ExpenseList from '@/components/app/ExpenseList';
import SavingsGoalList from '@/components/app/SavingsGoalList';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { AlertTriangle, BarChart3, CalendarDays, Loader2, PiggyBank, PlusCircle, Repeat, FilterX, ListFilter } from 'lucide-react';
import type { Expense, FinancialTip, CurrencyCode, Profile, ExpenseCategory, SavingsGoal, RecurringExpense, RecurrenceType } from '@/types';
import { SUPPORTED_CURRENCIES, EXPENSE_CATEGORIES } from '@/types';
import type { ExpenseFormData } from '@/components/app/AddExpenseSheet';
import type { SavingsGoalFormData } from '@/components/app/AddSavingsGoalSheet';
import type { RecurringExpenseFormData } from '@/components/app/AddRecurringExpenseSheet';
import { generateFinancialTip } from '@/ai/flows/generate-financial-tip';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, addMonths, addWeeks, getDay, endOfMonth as dateFnsEndOfMonth, isBefore, isSameDay, startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import type { User, Subscription } from '@supabase/supabase-js';
import { checkAndAwardUnderBudgetMonth } from '@/lib/achievementsHelper';
import { ScrollArea } from '@/components/ui/scroll-area';


// Dynamically import components
const AddExpenseSheet = dynamic(() => import('@/components/app/AddExpenseSheet'), {
  ssr: false,
  loading: () => <div className="w-full h-screen fixed inset-0 z-50 bg-black/10 backdrop-blur-sm" aria-hidden="true" /> 
});
const AddSavingsGoalSheet = dynamic(() => import('@/components/app/AddSavingsGoalSheet'), {
  ssr: false,
  loading: () => <div className="w-full h-screen fixed inset-0 z-50 bg-black/10 backdrop-blur-sm" aria-hidden="true" />
});
const AddFundsToGoalSheet = dynamic(() => import('@/components/app/AddFundsToGoalSheet'), { 
  ssr: false,
  loading: () => <div className="w-full h-screen fixed inset-0 z-50 bg-black/10 backdrop-blur-sm" aria-hidden="true" />
});
const AddRecurringExpenseSheet = dynamic(() => import('@/components/app/AddRecurringExpenseSheet'), {
  ssr: false,
  loading: () => <div className="w-full h-screen fixed inset-0 z-50 bg-black/10 backdrop-blur-sm" aria-hidden="true" />
});
const RecurringExpenseList = dynamic(() => import('@/components/app/RecurringExpenseList'), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-muted-foreground">Loading recurring expenses...</div>
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
const DeleteSavingsGoalDialog = dynamic(() => import('@/components/app/DeleteSavingsGoalDialog'), { ssr: false });
const DeleteRecurringExpenseDialog = dynamic(() => import('@/components/app/DeleteRecurringExpenseDialog'), { ssr: false });


export default function BudgetFlowPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authSubscription, setAuthSubscription] = useState<Subscription | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);
  const [isAddSavingsGoalSheetOpen, setIsAddSavingsGoalSheetOpen] = useState(false);
  const [isAddFundsSheetOpen, setIsAddFundsSheetOpen] = useState(false); 
  const [isAddRecurringExpenseSheetOpen, setIsAddRecurringExpenseSheetOpen] = useState(false);
  const [goalToAddTo, setGoalToAddTo] = useState<SavingsGoal | null>(null); 

  const [financialTip, setFinancialTip] = useState<FinancialTip | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  const [budgetThreshold, setBudgetThreshold] = useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);
  const [recurringExpenseToEdit, setRecurringExpenseToEdit] = useState<RecurringExpense | null>(null);

  const [isDeleteExpenseDialogOpen, setIsDeleteExpenseDialogOpen] = useState(false);
  const [isDeleteSavingsGoalDialogOpen, setIsDeleteSavingsGoalDialogOpen] = useState(false);
  const [isDeleteRecurringExpenseDialogOpen, setIsDeleteRecurringExpenseDialogOpen] = useState(false);

  const [expenseIdToDelete, setExpenseIdToDelete] = useState<string | null>(null);
  const [goalIdToDelete, setGoalIdToDelete] = useState<string | null>(null);
  const [goalNameToDelete, setGoalNameToDelete] = useState<string | undefined>(undefined);
  const [recurringExpenseIdToDelete, setRecurringExpenseIdToDelete] = useState<string | null>(null);
  const [recurringExpenseNameToDelete, setRecurringExpenseNameToDelete] = useState<string | undefined>(undefined);
  
  const [selectedPieCategory, setSelectedPieCategory] = useState<ExpenseCategory | null>(null);


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
  }, [router]);

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
        if (error.code === 'PGRST116') { 
          console.log('No profile found for user, attempting to create one or using defaults.');
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

  const fetchSavingsGoals = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching savings goals:', error);
      toast({ title: 'Savings Goals Load Error', description: `Could not load savings goals: ${error.message}`, variant: 'destructive' });
      setSavingsGoals([]);
    } else if (data) {
      setSavingsGoals(data.map(goal => ({ ...goal, target_date: goal.target_date ? parseISO(goal.target_date) : null })) as SavingsGoal[]);
    }
  }, [toast]);

  const fetchRecurringExpenses = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('next_due_date', { ascending: true });

    if (error) {
      console.error('Error fetching recurring expenses:', error);
      toast({ title: 'Recurring Expenses Load Error', description: `Could not load recurring expenses: ${error.message}`, variant: 'destructive' });
      setRecurringExpenses([]);
    } else if (data) {
      setRecurringExpenses(data.map(re => ({
        ...re,
        start_date: parseISO(re.start_date),
        next_due_date: parseISO(re.next_due_date),
        end_date: re.end_date ? parseISO(re.end_date) : null,
      })) as RecurringExpense[]);
    }
  }, [toast]);

  const processRecurringExpenses = useCallback(async (currentRecurringExpenses: RecurringExpense[]) => {
    if (!user) return;
    const today = startOfDay(new Date());
    let newExpensesCreated = false;

    for (const re of currentRecurringExpenses) {
      if (!re.is_active) continue;
      if (re.end_date && isBefore(re.end_date, today)) continue; // Ended

      let nextDueDate = parseISO(re.next_due_date as unknown as string); // Ensure it's a Date object

      while (isBefore(nextDueDate, today) || isSameDay(nextDueDate, today)) {
        // Check if an expense for this recurring_expense_id and due_date already exists
        const { data: existing, error: checkError } = await supabase
          .from('expenses')
          .select('id')
          .eq('user_id', user.id)
          .eq('recurring_expense_id', re.id)
          .eq('date', format(nextDueDate, 'yyyy-MM-dd'))
          .limit(1);

        if (checkError) {
          console.error('Error checking for existing recurring instance:', checkError);
          break; 
        }

        if (existing && existing.length > 0) {
          // Instance already exists, just advance date if needed
        } else {
           // Create new expense instance
          const newExpenseData = {
            user_id: user.id,
            description: re.description,
            amount: re.amount,
            category: re.category as ExpenseCategory,
            date: format(nextDueDate, 'yyyy-MM-dd'),
            recurring_expense_id: re.id,
            is_auto_generated: true,
          };
          const { data: savedExpense, error: insertError } = await supabase
            .from('expenses')
            .insert(newExpenseData)
            .select()
            .single();

          if (insertError) {
            console.error('Error auto-creating recurring expense instance:', insertError);
            break; 
          }
          if (savedExpense) {
            setExpenses(prev => [{ ...savedExpense, date: parseISO(savedExpense.date) } as Expense, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            newExpensesCreated = true;
          }
        }

        // Advance next_due_date for the recurring expense template
        let advancedDate;
        if (re.recurrence_type === 'monthly' && re.day_of_month) {
            let tempDate = addMonths(nextDueDate, 1);
            const lastDayOfNextMonth = dateFnsEndOfMonth(tempDate).getDate();
            advancedDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), Math.min(re.day_of_month, lastDayOfNextMonth));
        } else if (re.recurrence_type === 'weekly' && re.day_of_week !== null) {
            advancedDate = addWeeks(nextDueDate, 1);
            // Adjust to the correct day_of_week if it drifted (shouldn't typically with addWeeks)
            while(getDay(advancedDate) !== re.day_of_week) {
                advancedDate = addDays(advancedDate,1); // This might need more robust logic for specific day finding
            }
        } else {
            // Fallback for other types or if logic is missing (e.g. daily, yearly not implemented yet)
            console.warn(`Unsupported recurrence type for advancing date: ${re.recurrence_type}`);
            break; 
        }
        
        if (advancedDate) {
            nextDueDate = advancedDate;
        } else {
            break; // Could not advance date
        }


        if (re.end_date && isBefore(re.end_date, nextDueDate)) {
          // Next due date is past end_date, stop generating for this one
          const { error: updateError } = await supabase
            .from('recurring_expenses')
            .update({ next_due_date: format(nextDueDate, 'yyyy-MM-dd'), is_active: false })
            .eq('id', re.id);
          if (updateError) console.error("Error deactivating recurring expense:", updateError);
          break;
        } else {
          const { error: updateError } = await supabase
            .from('recurring_expenses')
            .update({ next_due_date: format(nextDueDate, 'yyyy-MM-dd') })
            .eq('id', re.id);
          if (updateError) console.error("Error updating next_due_date:", updateError);
        }
      }
    }
    if (newExpensesCreated) {
      fetchRecurringExpenses(user.id); // Refresh recurring expenses list to show updated next_due_dates
    }
  }, [user, supabase, setExpenses, fetchRecurringExpenses]);

  useEffect(() => {
    let isDataEffectMounted = true;
    if (!isLoadingAuth && user?.id) {
      setIsLoadingData(true);
      Promise.all([
        fetchProfile(user.id),
        fetchExpenses(user.id),
        fetchSavingsGoals(user.id),
        fetchRecurringExpenses(user.id).then((fetchedREs) => {
            // After fetching recurring expenses, process them
            // Need to ensure fetchedREs (the result of fetchRecurringExpenses) is available here.
            // fetchRecurringExpenses updates state, so use the state value.
            // This will be handled by the subsequent effect on `recurringExpenses`
        })
      ]).finally(() => {
        if (isDataEffectMounted) setIsLoadingData(false);
      });
    } else if (!isLoadingAuth && !user) {
      setExpenses([]);
      setSavingsGoals([]);
      setRecurringExpenses([]);
      setBudgetThreshold(null);
      setSelectedCurrency('USD');
      setFinancialTip(null);
      if (isDataEffectMounted) setIsLoadingData(false);
    }
    return () => { isDataEffectMounted = false; };
  }, [user, isLoadingAuth, fetchProfile, fetchExpenses, fetchSavingsGoals, fetchRecurringExpenses]);
  
  useEffect(() => {
    if (user && recurringExpenses.length > 0 && !isLoadingData) {
      processRecurringExpenses(recurringExpenses);
    }
  }, [user, recurringExpenses, isLoadingData, processRecurringExpenses]);


  const availableYears = useMemo(() => {
    const yearsFromExpenses = new Set(expenses.map(exp => new Date(exp.date).getFullYear()));
    const currentYear = new Date().getFullYear();
    yearsFromExpenses.add(currentYear);
    yearsFromExpenses.add(currentYear - 1);
    yearsFromExpenses.add(currentYear + 1); // Allow future year selection
    return Array.from(yearsFromExpenses).sort((a, b) => b - a);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let monthExpenses = expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
    });
    if (selectedPieCategory) {
      monthExpenses = monthExpenses.filter(exp => exp.category === selectedPieCategory);
    }
    return monthExpenses;
  }, [expenses, selectedMonth, selectedYear, selectedPieCategory]);

  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budgetExceeded = budgetThreshold !== null && totalSpent > budgetThreshold;

  useEffect(() => {
    if (user && !isLoadingData && budgetThreshold !== null && filteredExpenses.length > 0 && !selectedPieCategory) {
      checkAndAwardUnderBudgetMonth(
        user,
        totalSpent,
        budgetThreshold,
        selectedMonth,
        selectedYear,
        toast
      );
    }
  }, [user, isLoadingData, filteredExpenses, totalSpent, budgetThreshold, selectedMonth, selectedYear, toast, selectedPieCategory]);


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

  const handleSaveSavingsGoal = useCallback(async (goalData: SavingsGoalFormData, goalId?: string) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to save a savings goal.", variant: "destructive" });
      return;
    }
    try {
      const dataToSave = {
        ...goalData,
        target_date: goalData.target_date ? format(goalData.target_date, 'yyyy-MM-dd') : null,
        user_id: user.id,
      };

      if (goalId) { 
        const { data: updatedGoal, error } = await supabase
          .from('savings_goals')
          .update(dataToSave)
          .eq('id', goalId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        if (updatedGoal) {
          setSavingsGoals(prevGoals =>
            prevGoals.map(g =>
              g.id === updatedGoal.id ? { ...updatedGoal, target_date: updatedGoal.target_date ? parseISO(updatedGoal.target_date) : null } as SavingsGoal : g
            ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          );
          toast({ title: "Savings Goal Updated", description: `${updatedGoal.goal_name} successfully updated.` });
        }
        setGoalToEdit(null);
      } else { 
        const { data: savedGoal, error } = await supabase
          .from('savings_goals')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;

        if (savedGoal) {
           setSavingsGoals(prevGoals =>
            [...prevGoals, { ...savedGoal, target_date: savedGoal.target_date ? parseISO(savedGoal.target_date) : null } as SavingsGoal]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          );
          toast({ title: "Savings Goal Added", description: `${savedGoal.goal_name} successfully added.` });
        }
      }
    } catch (error: any) {
      console.error("Failed to save savings goal:", error);
      toast({ title: "Save Error", description: error.message || "Could not save savings goal.", variant: "destructive" });
    }
  }, [user, toast]);

  const handleSaveRecurringExpense = useCallback(async (recurringData: RecurringExpenseFormData, recurringId?: string) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      const dataToSave = {
        ...recurringData,
        user_id: user.id,
        start_date: format(recurringData.start_date, 'yyyy-MM-dd'),
        end_date: recurringData.end_date ? format(recurringData.end_date, 'yyyy-MM-dd') : null,
        next_due_date: format(recurringData.next_due_date || recurringData.start_date, 'yyyy-MM-dd'), // Ensure next_due_date is set
        is_active: recurringData.is_active,
      };

      if (recurringId) {
        const { data: updatedRecurring, error } = await supabase
          .from('recurring_expenses')
          .update(dataToSave)
          .eq('id', recurringId)
          .select()
          .single();
        if (error) throw error;
        if (updatedRecurring) {
          setRecurringExpenses(prev =>
            prev.map(re => (re.id === updatedRecurring.id ? { ...updatedRecurring, start_date: parseISO(updatedRecurring.start_date), next_due_date: parseISO(updatedRecurring.next_due_date), end_date: updatedRecurring.end_date ? parseISO(updatedRecurring.end_date) : null } as RecurringExpense : re))
            .sort((a,b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())
          );
          toast({ title: "Recurring Expense Updated", description: `${updatedRecurring.description} successfully updated.` });
        }
        setRecurringExpenseToEdit(null);
      } else {
        const { data: savedRecurring, error } = await supabase
          .from('recurring_expenses')
          .insert(dataToSave)
          .select()
          .single();
        if (error) throw error;
        if (savedRecurring) {
          setRecurringExpenses(prev =>
            [...prev, { ...savedRecurring, start_date: parseISO(savedRecurring.start_date), next_due_date: parseISO(savedRecurring.next_due_date), end_date: savedRecurring.end_date ? parseISO(savedRecurring.end_date) : null } as RecurringExpense]
            .sort((a,b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())
          );
          toast({ title: "Recurring Expense Added", description: `${savedRecurring.description} successfully added.` });
        }
      }
      processRecurringExpenses(recurringExpenses); // Re-process after add/edit
    } catch (error: any) {
      console.error("Failed to save recurring expense:", error);
      toast({ title: "Save Error", description: error.message || "Could not save recurring expense.", variant: "destructive" });
    }
  }, [user, toast, processRecurringExpenses, recurringExpenses]);


  const handleOpenAddFundsSheet = useCallback((goal: SavingsGoal) => {
    setGoalToAddTo(goal);
    setIsAddFundsSheetOpen(true);
  }, []);

  const handleSaveAddedFunds = useCallback(async (goalId: string, amountToAdd: number) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      const { data: currentGoalData, error: fetchError } = await supabase
        .from('savings_goals')
        .select('current_amount, target_amount')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentGoalData) throw new Error("Goal not found.");

      const newCurrentAmount = Math.min(currentGoalData.current_amount + amountToAdd, currentGoalData.target_amount);

      const { data: updatedGoal, error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (updateError) throw updateError;

      if (updatedGoal) {
        setSavingsGoals(prevGoals =>
          prevGoals.map(g =>
            g.id === updatedGoal.id ? { ...updatedGoal, target_date: updatedGoal.target_date ? parseISO(updatedGoal.target_date) : null } as SavingsGoal : g
          ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        );
        toast({ title: "Funds Added", description: `${formatCurrency(amountToAdd, selectedCurrency)} added to "${updatedGoal.goal_name}".` });
      }
    } catch (error: any) {
      console.error("Failed to add funds to savings goal:", error);
      toast({ title: "Update Error", description: error.message || "Could not add funds to goal.", variant: "destructive" });
    }
  }, [user, toast, selectedCurrency]);


  const handleEditExpenseClick = useCallback((expense: Expense) => {
    setExpenseToEdit(expense);
    setIsAddExpenseSheetOpen(true);
  }, []);

  const handleEditGoalClick = useCallback((goal: SavingsGoal) => {
    setGoalToEdit(goal);
    setIsAddSavingsGoalSheetOpen(true);
  }, []);

  const handleEditRecurringExpenseClick = useCallback((recurringExpense: RecurringExpense) => {
    setRecurringExpenseToEdit(recurringExpense);
    setIsAddRecurringExpenseSheetOpen(true);
  }, []);

  const handleDeleteExpenseClick = useCallback((id: string) => {
    setExpenseIdToDelete(id);
    setIsDeleteExpenseDialogOpen(true);
  }, []);

  const handleDeleteGoalClick = useCallback((goal: SavingsGoal) => {
    setGoalIdToDelete(goal.id);
    setGoalNameToDelete(goal.goal_name);
    setIsDeleteSavingsGoalDialogOpen(true);
  }, []);

  const handleDeleteRecurringExpenseClick = useCallback((re: RecurringExpense) => {
    setRecurringExpenseIdToDelete(re.id);
    setRecurringExpenseNameToDelete(re.description);
    setIsDeleteRecurringExpenseDialogOpen(true);
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

  const confirmDeleteSavingsGoal = useCallback(async () => {
    if (!user || !goalIdToDelete) {
      toast({ title: "Error", description: "User or goal ID missing.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalIdToDelete)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavingsGoals(prevGoals => prevGoals.filter(g => g.id !== goalIdToDelete));
      toast({ title: "Savings Goal Deleted", description: "Savings goal successfully deleted." });
    } catch (error: any) {
      console.error("Failed to delete savings goal:", error);
      toast({ title: "Delete Error", description: error.message || "Could not delete savings goal.", variant: "destructive" });
    } finally {
      setIsDeleteSavingsGoalDialogOpen(false);
      setGoalIdToDelete(null);
      setGoalNameToDelete(undefined);
    }
  }, [user, goalIdToDelete, toast]);

  const confirmDeleteRecurringExpense = useCallback(async () => {
    if (!user || !recurringExpenseIdToDelete) return;
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', recurringExpenseIdToDelete)
        .eq('user_id', user.id);
      if (error) throw error;
      setRecurringExpenses(prev => prev.filter(re => re.id !== recurringExpenseIdToDelete));
      toast({ title: "Recurring Expense Deleted", description: `"${recurringExpenseNameToDelete}" successfully deleted.` });
    } catch (error: any) {
      toast({ title: "Delete Error", description: error.message || "Could not delete recurring expense.", variant: "destructive" });
    } finally {
      setIsDeleteRecurringExpenseDialogOpen(false);
      setRecurringExpenseIdToDelete(null);
      setRecurringExpenseNameToDelete(undefined);
    }
  }, [user, recurringExpenseIdToDelete, recurringExpenseNameToDelete, toast]);


  const handleExportSummary = () => {
    if (filteredExpenses.length === 0) {
      toast({ title: "No Data", description: "No expenses in the selected month to export.", variant: "default" });
      return;
    }
    const headers = "ID,Date,Category,Description,Amount,IsAutoGenerated\n";
    const csvContent = filteredExpenses.map(e =>
      `${e.id},${format(e.date, 'yyyy-MM-dd')},${e.category},"${e.description.replace(/"/g, '""')}",${e.amount.toFixed(2)},${e.is_auto_generated ? 'Yes' : 'No'}`
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
        selectedPieCategory={selectedPieCategory}
        onClearPieCategoryFilter={() => setSelectedPieCategory(null)}
      />

      <main className="flex-grow container mx-auto p-2 xs:p-3 sm:p-4 space-y-3 sm:space-y-4">
        {budgetExceeded && !selectedPieCategory && (
          <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm sm:text-base">Budget Exceeded!</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              You have spent {formatCurrency(totalSpent, selectedCurrency)} for {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}, which is over your budget of {budgetThreshold ? formatCurrency(budgetThreshold, selectedCurrency) : 'N/A'}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <Card className="shadow-lg">
              <CardHeader className="p-2 xs:p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 sm:h-6 text-primary" />
                    <CardTitle><h2 className="font-headline text-base sm:text-lg">Recent Expenses</h2></CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPieCategory && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPieCategory(null)}
                        className="h-8 text-xs"
                      >
                        <FilterX className="mr-1.5 h-3.5 w-3.5" /> Clear "{selectedPieCategory}" Filter
                      </Button>
                    )}
                   {user && <SetThresholdDialog currentThreshold={budgetThreshold} onSetThreshold={handleSetThreshold} currency={selectedCurrency} />}
                  </div>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground shrink-0">
                        <CalendarDays className="h-3.5 w-3.5 sm:h-4" />
                        <span>For:</span>
                    </div>
                    <div className="flex flex-row gap-2 w-full">
                      <Select
                          value={selectedMonth.toString()}
                          onValueChange={(value) => {
                            setSelectedMonth(parseInt(value));
                            setSelectedPieCategory(null); // Clear category filter on month change
                          }}
                      >
                          <SelectTrigger className="flex-grow basis-auto sm:w-[130px] h-8 xs:h-9 text-xs sm:text-sm">
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
                          onValueChange={(value) => {
                            setSelectedYear(parseInt(value));
                            setSelectedPieCategory(null); // Clear category filter on year change
                          }}
                      >
                          <SelectTrigger className="flex-grow basis-auto sm:w-[100px] h-8 xs:h-9 text-xs sm:text-sm">
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
              <CardContent className="p-1.5 xs:p-2 sm:p-3 pt-0">
                 {filteredExpenses.length === 0 && !isLoadingData && !isLoadingAuth && !selectedPieCategory ? (
                    <div className="text-center text-muted-foreground py-4 xs:py-6 sm:py-8 min-h-[150px] sm:min-h-[200px] flex flex-col items-center justify-center">
                      <BarChart3 className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 xs:mb-3 sm:mb-4" />
                      <p className="text-xs xs:text-sm sm:text-lg font-semibold">No expenses for this period.</p>
                      <p className="text-[10px] xs:text-xs sm:text-sm">Add expenses or change the date.</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[240px] sm:h-[280px] md:h-[320px] lg:h-[360px] rounded-md">
                      <ExpenseList
                          expenses={filteredExpenses}
                          currency={selectedCurrency}
                          onEditExpense={handleEditExpenseClick}
                          onDeleteExpense={handleDeleteExpenseClick}
                          selectedPieCategory={selectedPieCategory}
                          onClearPieCategoryFilter={() => setSelectedPieCategory(null)}
                          totalFilteredExpenses={totalSpent} 
                      />
                    </ScrollArea>
                  )}
              </CardContent>
            </Card>
            
            {user && (
              <Card className="shadow-lg">
                <CardHeader className="p-2 xs:p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5 sm:h-6 text-primary" />
                      <CardTitle><h2 className="font-headline text-base sm:text-lg">Savings Goals</h2></CardTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setGoalToEdit(null);
                        setIsAddSavingsGoalSheetOpen(true);
                      }}
                      className="mt-2 sm:mt-0 h-8 sm:h-9 text-xs sm:text-sm"
                    >
                      <PlusCircle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Goal
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-1.5 xs:p-2 sm:p-3">
                  <SavingsGoalList
                    goals={savingsGoals}
                    currency={selectedCurrency}
                    onEditGoal={handleEditGoalClick}
                    onDeleteGoal={(goalId) => {
                        const goal = savingsGoals.find(g => g.id === goalId);
                        if(goal) handleDeleteGoalClick(goal);
                    }}
                    onAddGoalClick={() => {
                        setGoalToEdit(null);
                        setIsAddSavingsGoalSheetOpen(true);
                    }}
                    onAddFundsToGoal={handleOpenAddFundsSheet}
                  />
                </CardContent>
              </Card>
            )}
            {user && (
              <Card className="shadow-lg">
                 <CardHeader className="p-2 xs:p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-5 w-5 sm:h-6 text-primary" />
                      <CardTitle><h2 className="font-headline text-base sm:text-lg">Recurring Expenses</h2></CardTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setRecurringExpenseToEdit(null);
                        setIsAddRecurringExpenseSheetOpen(true);
                      }}
                      className="mt-2 sm:mt-0 h-8 sm:h-9 text-xs sm:text-sm"
                    >
                      <PlusCircle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Recurring
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-1.5 xs:p-2 sm:p-3">
                  <RecurringExpenseList
                    recurringExpenses={recurringExpenses}
                    currency={selectedCurrency}
                    onEditRecurringExpense={handleEditRecurringExpenseClick}
                    onDeleteRecurringExpense={(re) => handleDeleteRecurringExpenseClick(re)}
                    onAddRecurringExpenseClick={() => {
                      setRecurringExpenseToEdit(null);
                      setIsAddRecurringExpenseSheetOpen(true);
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
             {expenses.length === 0 && !isLoadingData && !isLoadingAuth ? (
                <Card className="shadow-lg h-[200px] xs:h-[230px] sm:h-[288px] flex items-center justify-center text-center text-muted-foreground p-3 sm:p-4">
                   <div>
                    <BarChart3 className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 xs:mb-3 sm:mb-4 mx-auto" />
                    <p className="text-xs xs:text-sm sm:text-base">Your expense chart will appear here.</p>
                   </div>
                </Card>
              ) : (
                user && <ExpenseChart expenses={expenses.filter(exp => { // Chart uses all expenses, not just filtered by month/year for category click context
                      const expenseDate = new Date(exp.date);
                      return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
                    })} 
                    currency={selectedCurrency}
                    onCategoryClick={(category) => setSelectedPieCategory(category)}
                    selectedCategory={selectedPieCategory}
                  />
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
      {user && isAddSavingsGoalSheetOpen && (
        <AddSavingsGoalSheet
          isOpen={isAddSavingsGoalSheetOpen}
          setIsOpen={(isOpen) => {
            setIsAddSavingsGoalSheetOpen(isOpen);
            if(!isOpen) {
              setGoalToEdit(null);
            }
          }}
          onSaveGoal={handleSaveSavingsGoal}
          currency={selectedCurrency}
          goalToEdit={goalToEdit}
        />
      )}
      {user && isAddFundsSheetOpen && (
        <AddFundsToGoalSheet
          isOpen={isAddFundsSheetOpen}
          setIsOpen={(isOpen) => {
            setIsAddFundsSheetOpen(isOpen);
            if(!isOpen) {
              setGoalToAddTo(null);
            }
          }}
          onSaveFunds={handleSaveAddedFunds}
          goal={goalToAddTo}
          currency={selectedCurrency}
        />
      )}
      {user && isAddRecurringExpenseSheetOpen && (
        <AddRecurringExpenseSheet
          isOpen={isAddRecurringExpenseSheetOpen}
          setIsOpen={(isOpen) => {
            setIsAddRecurringExpenseSheetOpen(isOpen);
            if(!isOpen) {
              setRecurringExpenseToEdit(null);
            }
          }}
          onSaveRecurringExpense={handleSaveRecurringExpense}
          currency={selectedCurrency}
          recurringExpenseToEdit={recurringExpenseToEdit}
        />
      )}
      {user && isDeleteExpenseDialogOpen && (
        <DeleteExpenseDialog
          isOpen={isDeleteExpenseDialogOpen}
          onOpenChange={setIsDeleteExpenseDialogOpen}
          onConfirmDelete={confirmDeleteExpense}
          itemName={expenses.find(e=>e.id === expenseIdToDelete)?.description || "this expense"}
        />
      )}
      {user && isDeleteSavingsGoalDialogOpen && (
         <DeleteSavingsGoalDialog
            isOpen={isDeleteSavingsGoalDialogOpen}
            onOpenChange={setIsDeleteSavingsGoalDialogOpen}
            onConfirmDelete={confirmDeleteSavingsGoal}
            goalName={goalNameToDelete}
         />
      )}
      {user && isDeleteRecurringExpenseDialogOpen && (
        <DeleteRecurringExpenseDialog
          isOpen={isDeleteRecurringExpenseDialogOpen}
          onOpenChange={setIsDeleteRecurringExpenseDialogOpen}
          onConfirmDelete={confirmDeleteRecurringExpense}
          itemName={recurringExpenseNameToDelete}
        />
      )}
    </div>
  );
}

    