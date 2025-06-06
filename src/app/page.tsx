
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AppHeader from '@/components/app/Header';
import AppFooter from '@/components/app/Footer';
import ExpenseList from '@/components/app/ExpenseList';
import SavingsGoalList from '@/components/app/SavingsGoalList';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { AlertTriangle, BarChart3, CalendarDays, Loader2, PiggyBank, PlusCircle, FilterX, Info } from 'lucide-react';
import type { Expense, FinancialTip, CurrencyCode, Profile, ExpenseCategory, SavingsGoal, UserProfileSettings } from '@/types';
import { SUPPORTED_CURRENCIES, EXPENSE_CATEGORIES } from '@/types';
import type { ExpenseFormData } from '@/components/app/AddExpenseSheet';
import type { SavingsGoalFormData } from '@/components/app/AddSavingsGoalSheet';
import { generateFinancialTip } from '@/ai/flows/generate-financial-tip';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, generateId } from '@/lib/utils';
import { format, parse, parseISO, startOfMonth, endOfMonth, isBefore, isSameDay, startOfDay, isValid, isDate } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import type { User, Subscription } from '@supabase/supabase-js';
import { checkAndAwardUnderBudgetMonth, checkAndAwardLoginStreak } from '@/lib/achievementsHelper';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  getLocalProfileSettings, saveLocalProfileSettings,
  getLocalExpenses, addLocalExpense, updateLocalExpense, deleteLocalExpense, addMultipleLocalExpenses,
  getLocalSavingsGoals, addLocalSavingsGoal, updateLocalSavingsGoal, deleteLocalSavingsGoal
} from '@/lib/localStore';
import { initializeLocalDataIfNotExists } from '@/lib/sampleData';

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

const ExpenseChart = dynamic(() => import('@/components/app/ExpenseChart'), {
  loading: () => (
    <Card className="shadow-lg">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle><h2 className="font-headline text-base sm:text-xl">Expense Breakdown</h2></CardTitle>
        <CardDescription className="text-xs sm:text-sm">Loading chart data...</CardDescription>
      </CardHeader>
      <CardContent className="h-[200px] xs:h-[230px] sm:h-[288px] flex flex-col items-center justify-center text-muted-foreground">
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

const GUEST_USER_ID = 'guest-user';
const GUEST_WARNING_DISMISSED_KEY = 'budgetflow_guestWarningDismissed_v1';


export default function BudgetFlowPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [appMode, setAppMode] = useState<'loading' | 'guest' | 'authenticated'>('loading');
  const [authSubscription, setAuthSubscription] = useState<Subscription | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);
  const [isAddSavingsGoalSheetOpen, setIsAddSavingsGoalSheetOpen] = useState(false);
  const [isAddFundsSheetOpen, setIsAddFundsSheetOpen] = useState(false);
  const [goalToAddTo, setGoalToAddTo] = useState<SavingsGoal | null>(null);

  const [financialTip, setFinancialTip] = useState<FinancialTip | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  const [userProfileSettings, setUserProfileSettings] = useState<UserProfileSettings>({
    budget_threshold: null,
    selected_currency: 'USD',
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);

  const [isDeleteExpenseDialogOpen, setIsDeleteExpenseDialogOpen] = useState(false);
  const [isDeleteSavingsGoalDialogOpen, setIsDeleteSavingsGoalDialogOpen] = useState(false);

  const [expenseIdToDelete, setExpenseIdToDelete] = useState<string | null>(null);
  const [goalIdToDelete, setGoalIdToDelete] = useState<string | null>(null);
  const [goalNameToDelete, setGoalNameToDelete] = useState<string | undefined>(undefined);

  const [selectedPieCategory, setSelectedPieCategory] = useState<ExpenseCategory | null>(null);
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    initializeLocalDataIfNotExists(); 

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (session) {
          setUser(session.user);
          setAppMode('authenticated');
        } else {
          setUser(null);
          setAppMode('guest');
        }
      }
    );
    setAuthSubscription(subscription);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        if (session) {
          setUser(session.user);
          setAppMode('authenticated');
        } else {
          setUser(null);
          setAppMode('guest');
        }
      }
    });

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);


  const fetchAuthenticatedUserData = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('budget_threshold, selected_currency, is_deactivated, last_login_at, login_streak_days')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (profileData) {
        if (profileData.is_deactivated) {
          toast({ title: 'Account Deactivated', variant: 'destructive' });
          await supabase.auth.signOut();
          setAppMode('guest'); 
          return;
        }
        setUserProfileSettings({
            budget_threshold: profileData.budget_threshold,
            selected_currency: (profileData.selected_currency as CurrencyCode) || 'USD'
        });
        await checkAndAwardLoginStreak({ id: userId } as User, profileData as Profile, toast);

      } else { 
        const {data: newProfile, error: newProfileError} = await supabase
        .from('profiles')
        .insert({id: userId, selected_currency: 'USD', budget_threshold: null, last_login_at: new Date().toISOString(), login_streak_days: 1})
        .select('budget_threshold, selected_currency')
        .single();
        if(newProfileError) throw newProfileError;
        if(newProfile) {
            setUserProfileSettings(newProfile);
        } else {
            setUserProfileSettings(getLocalProfileSettings()); 
        }
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*').eq('user_id', userId).order('date', { ascending: false });
      if (expensesError) throw expensesError;
      setExpenses(expensesData.map(exp => ({ ...exp, date: parseISO(exp.date) })) as Expense[]);

      const { data: goalsData, error: goalsError } = await supabase
        .from('savings_goals')
        .select('*').eq('user_id', userId).order('created_at', { ascending: true });
      if (goalsError) throw goalsError;
      setSavingsGoals(goalsData.map(goal => ({ ...goal, target_date: goal.target_date ? parseISO(goal.target_date) : null })) as SavingsGoal[]);

    } catch (error: any) {
      console.error('Error fetching authenticated user data:', error);
      toast({ title: 'Data Load Error', description: error.message, variant: 'destructive' });
      setExpenses([]); setSavingsGoals([]); setUserProfileSettings(getLocalProfileSettings());
    }
  }, [toast]);

  const loadGuestData = useCallback(() => {
    setUserProfileSettings(getLocalProfileSettings());
    setExpenses(getLocalExpenses());
    setSavingsGoals(getLocalSavingsGoals());
    if (typeof window !== 'undefined') {
        const guestWarningDismissed = localStorage.getItem(GUEST_WARNING_DISMISSED_KEY);
        if (guestWarningDismissed !== 'true') {
            setShowGuestWarning(true);
        }
    }
  }, []);

 useEffect(() => {
    let isMounted = true;
    if (appMode === 'loading') {
      setIsLoadingData(true);
      return;
    }

    setIsLoadingData(true);
    if (appMode === 'authenticated' && user) {
      setShowGuestWarning(false); 
      fetchAuthenticatedUserData(user.id).finally(() => {
        if (isMounted) setIsLoadingData(false);
      });
    } else if (appMode === 'guest') {
      loadGuestData();
      if (isMounted) setIsLoadingData(false);
    } else {
      setExpenses([]);
      setSavingsGoals([]);
      setUserProfileSettings(getLocalProfileSettings()); 
      if (isMounted) setIsLoadingData(false);
    }
    return () => { isMounted = false; };
  }, [appMode, user, fetchAuthenticatedUserData, loadGuestData]);


  const availableYears = useMemo(() => {
    const yearsFromExpenses = new Set(expenses.map(exp => new Date(exp.date).getFullYear()));
    const currentYear = new Date().getFullYear();
    yearsFromExpenses.add(currentYear); yearsFromExpenses.add(currentYear - 1); yearsFromExpenses.add(currentYear + 1);
    return Array.from(yearsFromExpenses).sort((a, b) => b - a);
  }, [expenses]);

  const expensesForSelectedMonthYear = useMemo(() => {
    return expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const totalSpendingForMonth = useMemo(() => {
    return expensesForSelectedMonthYear.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expensesForSelectedMonthYear]);

  const filteredExpensesToList = useMemo(() => {
    if (selectedPieCategory) {
      return expensesForSelectedMonthYear.filter(exp => exp.category === selectedPieCategory);
    }
    return expensesForSelectedMonthYear;
  }, [expensesForSelectedMonthYear, selectedPieCategory]);

  const totalDisplayedInList = useMemo(() => {
    return filteredExpensesToList.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpensesToList]);

  const budgetExceeded = userProfileSettings.budget_threshold !== null && totalSpendingForMonth > userProfileSettings.budget_threshold;

  useEffect(() => {
    if (appMode === 'authenticated' && user && !isLoadingData && userProfileSettings.budget_threshold !== null && expensesForSelectedMonthYear.length > 0) {
      checkAndAwardUnderBudgetMonth(user, totalSpendingForMonth, userProfileSettings.budget_threshold, selectedMonth, selectedYear, toast);
    }
  }, [appMode, user, isLoadingData, expensesForSelectedMonthYear, totalSpendingForMonth, userProfileSettings.budget_threshold, selectedMonth, selectedYear, toast]);


  const fetchNewTip = useCallback(async () => {
    if (appMode !== 'authenticated' || !user) {
        setFinancialTip(null);
        setIsLoadingTip(false);
        return;
    }
    setIsLoadingTip(true);
    try {
      const tipInput = {
        financialSituation: `User is tracking expenses. Total spent this period: ${formatCurrency(totalSpendingForMonth, userProfileSettings.selected_currency)}. Budget: ${userProfileSettings.budget_threshold ? formatCurrency(userProfileSettings.budget_threshold, userProfileSettings.selected_currency) : 'Not set'}.`,
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
  }, [appMode, user, totalSpendingForMonth, userProfileSettings.selected_currency, userProfileSettings.budget_threshold]);

 useEffect(() => {
    let isMounted = true;
    if (appMode === 'authenticated' && user && !isLoadingData && !financialTip) {
        fetchNewTip();
    } else if (appMode === 'guest') {
        setFinancialTip(null);
        setIsLoadingTip(false);
    }
     return () => { isMounted = false; };
  }, [appMode, user, isLoadingData, financialTip, fetchNewTip]);


  const handleSaveExpense = useCallback(async (expenseData: ExpenseFormData) => {
    const formattedDate = format(expenseData.date, 'yyyy-MM-dd');
    const now = new Date().toISOString();

    if (appMode === 'authenticated' && user) {
      try {
        if (expenseToEdit) {
          const { data: updatedExpense, error } = await supabase.from('expenses')
            .update({ ...expenseData, date: formattedDate, updated_at: now })
            .eq('id', expenseToEdit.id).eq('user_id', user.id).select().single();
          if (error) throw error;
          if (updatedExpense) {
            setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? { ...updatedExpense, date: parseISO(updatedExpense.date) } as Expense : exp).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() ));
            toast({ title: "Expense Updated" });
          }
        } else {
          const { data: savedExpense, error } = await supabase.from('expenses')
            .insert([{ ...expenseData, date: formattedDate, user_id: user.id, created_at: now, updated_at: now }]).select().single();
          if (error) throw error;
          if (savedExpense) {
            setExpenses(prev => [{ ...savedExpense, date: parseISO(savedExpense.date) } as Expense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            toast({ title: "Expense Added" });
          }
        }
      } catch (error: any) {
        toast({ title: "Save Error", description: error.message, variant: "destructive" });
      } finally {
        setExpenseToEdit(null); 
      }
    } else if (appMode === 'guest') {
        if (expenseToEdit) {
            const updated = updateLocalExpense({
                ...expenseToEdit, 
                ...expenseData, 
                date: expenseData.date, 
                updated_at: now,
            });
            if(updated) {
                setExpenses(getLocalExpenses());
                toast({ title: "Expense Updated (Local)" });
            }
        } else {
            addLocalExpense(expenseData); 
            setExpenses(getLocalExpenses());
            toast({ title: "Expense Added (Local)" });
        }
        setExpenseToEdit(null); 
    }
  }, [appMode, user, toast, expenseToEdit]);

  const handleSaveSavingsGoal = useCallback(async (goalData: SavingsGoalFormData, goalId?: string) => {
    const now = new Date().toISOString();
    const dataToSave = {
        ...goalData,
        target_date: goalData.target_date ? format(goalData.target_date, 'yyyy-MM-dd') : null,
    };

    if (appMode === 'authenticated' && user) {
      try {
        if (goalId) {
          const { data: updatedGoal, error } = await supabase.from('savings_goals')
            .update({...dataToSave, updated_at: now }).eq('id', goalId).eq('user_id', user.id).select().single();
          if (error) throw error;
          if(updatedGoal) {
            setSavingsGoals(prev => prev.map(g => g.id === updatedGoal.id ? { ...updatedGoal, target_date: updatedGoal.target_date ? parseISO(updatedGoal.target_date) : null } as SavingsGoal : g).sort((a,b)=>new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            toast({ title: "Goal Updated" });
          }
        } else {
          const { data: savedGoal, error } = await supabase.from('savings_goals')
            .insert([{ ...dataToSave, user_id: user.id, created_at:now, updated_at:now }]).select().single();
          if (error) throw error;
          if(savedGoal){
            setSavingsGoals(prev => [...prev, { ...savedGoal, target_date: savedGoal.target_date ? parseISO(savedGoal.target_date) : null } as SavingsGoal].sort((a,b)=>new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            toast({ title: "Goal Added" });
          }
        }
      } catch (error: any) {
        toast({ title: "Save Error", description: error.message, variant: "destructive" });
      } finally {
        setGoalToEdit(null);
      }
    } else if (appMode === 'guest') {
        if (goalId && goalToEdit) { 
            const updated = updateLocalSavingsGoal({
                ...goalToEdit, 
                ...goalData, 
                target_date: goalData.target_date, 
                updated_at: now,
            });
            if(updated) {
                setSavingsGoals(getLocalSavingsGoals());
                toast({ title: "Goal Updated (Local)" });
            }
        } else {
             addLocalSavingsGoal(goalData); 
             setSavingsGoals(getLocalSavingsGoals());
             toast({ title: "Goal Added (Local)" });
        }
        setGoalToEdit(null);
    }
  }, [appMode, user, toast, goalToEdit]);

  const handleOpenAddFundsSheet = useCallback((goal: SavingsGoal) => {
    setGoalToAddTo(goal);
    setIsAddFundsSheetOpen(true);
  }, []);

  const handleSaveAddedFunds = useCallback(async (goalId: string, amountToAdd: number) => {
    const now = new Date().toISOString();
    if (appMode === 'authenticated' && user) {
        try {
            const { data: currentGoalData, error: fetchError } = await supabase.from('savings_goals')
              .select('current_amount, target_amount').eq('id', goalId).eq('user_id', user.id).single();
            if (fetchError || !currentGoalData) throw fetchError || new Error("Goal not found.");
            const newCurrentAmount = Math.min(currentGoalData.current_amount + amountToAdd, currentGoalData.target_amount);
            const { data: updatedGoal, error } = await supabase.from('savings_goals')
              .update({ current_amount: newCurrentAmount, updated_at: now }).eq('id', goalId).eq('user_id', user.id).select().single();
            if (error) throw error;
            if(updatedGoal) {
                setSavingsGoals(prev => prev.map(g => g.id === updatedGoal.id ? { ...updatedGoal, target_date: updatedGoal.target_date ? parseISO(updatedGoal.target_date) : null } as SavingsGoal : g).sort((a,b)=>new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
                toast({ title: "Funds Added" });
            }
        } catch (error: any) {
            toast({ title: "Update Error", description: error.message, variant: "destructive" });
        }
    } else if (appMode === 'guest') {
        const goal = savingsGoals.find(g => g.id === goalId);
        if (goal) {
            const newCurrentAmount = Math.min(goal.current_amount + amountToAdd, goal.target_amount);
            updateLocalSavingsGoal({ ...goal, current_amount: newCurrentAmount, updated_at: now });
            setSavingsGoals(getLocalSavingsGoals());
            toast({ title: "Funds Added (Local)"});
        }
    }
  }, [appMode, user, toast, savingsGoals]);

  const handleEditExpenseClick = useCallback((expense: Expense) => { setExpenseToEdit(expense); setIsAddExpenseSheetOpen(true); }, []);
  const handleEditGoalClick = useCallback((goal: SavingsGoal) => { setGoalToEdit(goal); setIsAddSavingsGoalSheetOpen(true); }, []);
  const handleDeleteExpenseClick = useCallback((id: string) => { setExpenseIdToDelete(id); setIsDeleteExpenseDialogOpen(true); }, []);
  const handleDeleteGoalClick = useCallback((goal: SavingsGoal) => { setGoalIdToDelete(goal.id); setGoalNameToDelete(goal.goal_name); setIsDeleteSavingsGoalDialogOpen(true); }, []);

  const confirmDeleteExpense = useCallback(async () => {
    if (!expenseIdToDelete) return;
    if (appMode === 'authenticated' && user) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', expenseIdToDelete).eq('user_id', user.id);
        if (error) throw error;
        setExpenses(prev => prev.filter(exp => exp.id !== expenseIdToDelete));
        toast({ title: "Expense Deleted" });
      } catch (error: any) {
        toast({ title: "Delete Error", description: error.message, variant: "destructive" });
      }
    } else if (appMode === 'guest') {
        deleteLocalExpense(expenseIdToDelete);
        setExpenses(getLocalExpenses());
        toast({ title: "Expense Deleted (Local)" });
    }
    setIsDeleteExpenseDialogOpen(false); setExpenseIdToDelete(null);
  }, [appMode, user, expenseIdToDelete, toast]);

  const confirmDeleteSavingsGoal = useCallback(async () => {
    if (!goalIdToDelete) return;
     if (appMode === 'authenticated' && user) {
      try {
        const { error } = await supabase.from('savings_goals').delete().eq('id', goalIdToDelete).eq('user_id', user.id);
        if (error) throw error;
        setSavingsGoals(prev => prev.filter(g => g.id !== goalIdToDelete));
        toast({ title: "Goal Deleted" });
      } catch (error: any) {
        toast({ title: "Delete Error", description: error.message, variant: "destructive" });
      }
    } else if (appMode === 'guest') {
        deleteLocalSavingsGoal(goalIdToDelete);
        setSavingsGoals(getLocalSavingsGoals());
        toast({ title: "Goal Deleted (Local)" });
    }
    setIsDeleteSavingsGoalDialogOpen(false); setGoalIdToDelete(null); setGoalNameToDelete(undefined);
  }, [appMode, user, goalIdToDelete, toast]);

  const handleExportSummary = useCallback(() => { 
    if (filteredExpensesToList.length === 0) {
      toast({ title: "No Data", description: "No expenses in the selected month/category to export." });
      return;
    }
    const headers = "ID,Date,Category,Description,Amount\n";
    const csvContent = filteredExpensesToList.map(e =>
      `${e.id},${format(e.date, 'yyyy-MM-dd')},${e.category},"${e.description.replace(/"/g, '""')}",${e.amount.toFixed(2)}`
    ).join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `budgetflow_summary_${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}${selectedPieCategory ? '_'+selectedPieCategory : ''}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
    toast({ title: "Export Successful" });
  }, [filteredExpensesToList, selectedMonth, selectedYear, selectedPieCategory, toast]);

  const handleImportCSV = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
        const csvText = event.target?.result as string;
        if (!csvText) {
            toast({ title: "Import Error", description: "Could not read file.", variant: "destructive" });
            return;
        }

        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            toast({ title: "Import Error", description: "CSV file must contain a header row and at least one data row.", variant: "destructive" });
            return;
        }

        const headerLine = lines[0].toLowerCase();
        // Basic CSV parsing: split by comma, trim whitespace, handle simple quotes
        const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

        const dateIdx = headers.indexOf('date');
        const categoryIdx = headers.indexOf('category');
        const descriptionIdx = headers.indexOf('description');
        const amountIdx = headers.indexOf('amount');

        if (dateIdx === -1 || categoryIdx === -1 || descriptionIdx === -1 || amountIdx === -1) {
            toast({ title: "Import Error", description: "CSV header must contain: Date, Category, Description, Amount.", variant: "destructive" });
            return;
        }

        const importedExpenses: Array<Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = [];
        let failedRowCount = 0;
        const now = new Date().toISOString();

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            if (values.length < Math.max(dateIdx, categoryIdx, descriptionIdx, amountIdx) + 1) {
                failedRowCount++;
                continue;
            }

            const dateStr = values[dateIdx];
            const categoryStr = values[categoryIdx];
            const descriptionStr = values[descriptionIdx];
            const amountStr = values[amountIdx];
            
            // Attempt to parse date, try common formats
            let parsedDate: Date | null = null;
            const dateFormatsToTry = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy/MM/dd'];
            for (const fmt of dateFormatsToTry) {
                const dt = parse(dateStr, fmt, new Date());
                if (isValid(dt)) {
                    parsedDate = dt;
                    break;
                }
            }
             if (!parsedDate) {
                failedRowCount++;
                console.warn(`Skipping row ${i+1}: Invalid date format "${dateStr}"`);
                continue;
            }


            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) {
                failedRowCount++;
                console.warn(`Skipping row ${i+1}: Invalid amount "${amountStr}"`);
                continue;
            }

            if (!descriptionStr) {
                failedRowCount++;
                console.warn(`Skipping row ${i+1}: Missing description`);
                continue;
            }
            
            const category = EXPENSE_CATEGORIES.find(cat => cat.toLowerCase() === categoryStr.toLowerCase()) as ExpenseCategory | undefined;
            if (!category) {
                failedRowCount++;
                 console.warn(`Skipping row ${i+1}: Invalid category "${categoryStr}"`);
                continue;
            }

            importedExpenses.push({
                date: parsedDate,
                category,
                description: descriptionStr,
                amount,
            });
        }

        if (importedExpenses.length > 0) {
            if (appMode === 'authenticated' && user) {
                const expensesToSave = importedExpenses.map(exp => ({
                    ...exp,
                    user_id: user.id,
                    created_at: now,
                    updated_at: now,
                    date: format(exp.date, 'yyyy-MM-dd'), // Format date for Supabase
                }));
                try {
                    const { error: insertError } = await supabase.from('expenses').insert(expensesToSave);
                    if (insertError) throw insertError;
                    // Refetch all expenses to update the list
                    fetchAuthenticatedUserData(user.id); 
                } catch (error: any) {
                    toast({ title: "Database Error", description: `Could not save imported expenses: ${error.message}`, variant: "destructive" });
                    return; // Stop if DB save fails
                }
            } else if (appMode === 'guest') {
                addMultipleLocalExpenses(importedExpenses);
                setExpenses(getLocalExpenses()); // Refresh from local storage
            }
        }

        let toastMessage = "";
        if (importedExpenses.length > 0) {
            toastMessage += `${importedExpenses.length} expenses imported successfully. `;
        }
        if (failedRowCount > 0) {
            toastMessage += `${failedRowCount} rows failed to import.`;
        }
        if (!toastMessage) {
            toastMessage = "No valid expenses found to import.";
        }
        toast({ title: "Import Complete", description: toastMessage, duration: 5000 });
    };
    reader.onerror = () => {
        toast({ title: "Import Error", description: "Failed to read the file.", variant: "destructive"});
    };
    reader.readAsText(file);
  }, [appMode, user, toast, fetchAuthenticatedUserData]);


  const handleSetThreshold = useCallback(async (newThreshold: number | null) => {
    if (appMode === 'authenticated' && user) {
      try {
        const { error } = await supabase.from('profiles').upsert({ id: user.id, budget_threshold: newThreshold, updated_at:new Date().toISOString() }, { onConflict: 'id' });
        if (error) throw error;
        setUserProfileSettings(prev => ({ ...prev, budget_threshold: newThreshold }));
        toast({ title: newThreshold !== null ? "Budget Set" : "Budget Cleared" });
      } catch (error: any) {
        toast({ title: "Update Error", description: error.message, variant: "destructive" });
      }
    } else if (appMode === 'guest') {
        const currentSettings = getLocalProfileSettings();
        saveLocalProfileSettings({ ...currentSettings, budget_threshold: newThreshold });
        setUserProfileSettings({ ...currentSettings, budget_threshold: newThreshold });
        toast({ title: newThreshold !== null ? "Budget Set (Local)" : "Budget Cleared (Local)" });
    }
  }, [appMode, user, toast]);

  const handleCurrencyChange = useCallback(async (newCurrency: CurrencyCode) => {
    if (appMode === 'authenticated' && user) {
       try {
        const { error } = await supabase.from('profiles').upsert({ id: user.id, selected_currency: newCurrency, updated_at:new Date().toISOString() }, { onConflict: 'id' });
        if (error) throw error;
        setUserProfileSettings(prev => ({ ...prev, selected_currency: newCurrency }));
        toast({ title: "Currency Updated" });
      } catch (error: any) {
        toast({ title: "Update Error", description: error.message, variant: "destructive" });
      }
    } else if (appMode === 'guest') {
        const currentSettings = getLocalProfileSettings();
        saveLocalProfileSettings({ ...currentSettings, selected_currency: newCurrency });
        setUserProfileSettings({ ...currentSettings, selected_currency: newCurrency });
        toast({ title: "Currency Updated (Local)"});
    }
  }, [appMode, user, toast]);

  const handleCategoryChartClick = useCallback((category: ExpenseCategory | null) => {
    setSelectedPieCategory(prevCategory => category === prevCategory ? null : category);
  }, []);

  const handleOpenAddExpenseSheet = useCallback(() => {
    setExpenseToEdit(null);
    setIsAddExpenseSheetOpen(true);
  }, []);

  const handleOpenAddGoalSheet = useCallback(() => {
    setGoalToEdit(null);
    setIsAddSavingsGoalSheetOpen(true);
  }, []);

  const handleDismissGuestWarning = useCallback(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(GUEST_WARNING_DISMISSED_KEY, 'true');
    }
    setShowGuestWarning(false);
  }, []);

  if (appMode === 'loading' || isLoadingData) {
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
        appMode={appMode}
        onAddExpenseClick={handleOpenAddExpenseSheet}
        currentDisplaySpending={totalDisplayedInList} // This is the filtered amount
        overallMonthSpending={totalSpendingForMonth} // This is the total for budget check
        budgetThreshold={userProfileSettings.budget_threshold}
        selectedCurrency={userProfileSettings.selected_currency}
        onCurrencyChange={handleCurrencyChange}
        currencies={SUPPORTED_CURRENCIES}
      />

      <main className="flex-grow container mx-auto p-2 xs:p-3 sm:p-4 space-y-3 sm:space-y-4">
        {appMode === 'guest' && showGuestWarning && (
            <Alert variant="default" className="mb-3 sm:mb-4 shadow-md border-primary/50 bg-primary/5">
              <Info className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold text-primary">Welcome to Guest Mode!</AlertTitle>
              <AlertDescription className="space-y-1.5 text-sm text-foreground/80">
                <p>Your data is currently stored locally in this browser and is not synced to the cloud.</p>
                <p>If you choose to <Link href="/register" className="font-medium text-accent hover:underline">Sign Up</Link> or <Link href="/login" className="font-medium text-accent hover:underline">Login</Link> later, this local data <strong className="font-semibold text-accent">will not</strong> be automatically transferred to your cloud account and will be cleared from this browser when you sign in or register.</p>
                <Button onClick={handleDismissGuestWarning} variant="outline" size="sm" className="mt-2 h-8 text-xs">Got it, Dismiss</Button>
              </AlertDescription>
            </Alert>
        )}

        {budgetExceeded && (
          <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm sm:text-base">Budget Exceeded!</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              You have spent {formatCurrency(totalSpendingForMonth, userProfileSettings.selected_currency)} for {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}, which is over your budget of {userProfileSettings.budget_threshold ? formatCurrency(userProfileSettings.budget_threshold, userProfileSettings.selected_currency) : 'N/A'}.
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
                   <SetThresholdDialog currentThreshold={userProfileSettings.budget_threshold} onSetThreshold={handleSetThreshold} currency={userProfileSettings.selected_currency} />
                </div>
                <div className="flex flex-row items-center gap-2">
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground shrink-0"> <CalendarDays className="h-3.5 w-3.5 sm:h-4" /> <span>For:</span> </div>
                    <div className="flex flex-row gap-2 w-full">
                      <Select value={selectedMonth.toString()} onValueChange={(value) => { setSelectedMonth(parseInt(value)); setSelectedPieCategory(null); }}>
                          <SelectTrigger className="flex-grow basis-auto sm:w-[130px] h-8 xs:h-9 text-xs sm:text-sm"><SelectValue placeholder="Month" /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 12 }, (_, i) => (<SelectItem key={i} value={i.toString()} className="text-xs sm:text-sm">{format(new Date(selectedYear, i), 'MMMM')}</SelectItem>))}</SelectContent>
                      </Select>
                      <Select value={selectedYear.toString()} onValueChange={(value) => { setSelectedYear(parseInt(value)); setSelectedPieCategory(null); }}>
                          <SelectTrigger className="flex-grow basis-auto sm:w-[100px] h-8 xs:h-9 text-xs sm:text-sm"><SelectValue placeholder="Year" /></SelectTrigger>
                          <SelectContent>{availableYears.map(year => (<SelectItem key={year} value={year.toString()} className="text-xs sm:text-sm">{year}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-1.5 xs:p-2 sm:p-3 pt-0">
                 {filteredExpensesToList.length === 0 && !isLoadingData && !selectedPieCategory ? (
                    <div className="text-center text-muted-foreground py-4 xs:py-6 sm:py-8 min-h-[150px] sm:min-h-[200px] flex flex-col items-center justify-center">
                      <BarChart3 className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 xs:mb-3 sm:mb-4" />
                      <p className="text-xs xs:text-sm sm:text-lg font-semibold">No expenses for this period.</p>
                      <p className="text-[10px] xs:text-xs sm:text-sm">Add expenses or change the date.</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[240px] sm:h-[280px] md:h-[320px] lg:h-[360px] rounded-md">
                      <ExpenseList
                          expenses={filteredExpensesToList}
                          currency={userProfileSettings.selected_currency}
                          onEditExpense={handleEditExpenseClick}
                          onDeleteExpense={handleDeleteExpenseClick}
                          selectedPieCategory={selectedPieCategory}
                          onClearPieCategoryFilter={() => setSelectedPieCategory(null)}
                          totalFilteredExpenses={totalDisplayedInList}
                      />
                    </ScrollArea>
                  )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="p-2 xs:p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2"> <PiggyBank className="h-5 w-5 sm:h-6 text-primary" /> <CardTitle><h2 className="font-headline text-base sm:text-lg">Savings Goals</h2></CardTitle> </div>
                  <Button variant="outline" size="sm" onClick={handleOpenAddGoalSheet} className="mt-2 sm:mt-0 h-8 sm:h-9 text-xs sm:text-sm">
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Goal
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-1.5 xs:p-2 sm:p-3">
                <SavingsGoalList
                  goals={savingsGoals}
                  currency={userProfileSettings.selected_currency}
                  onEditGoal={handleEditGoalClick}
                  onDeleteGoal={(goalId) => { const goal = savingsGoals.find(g => g.id === goalId); if(goal) handleDeleteGoalClick(goal); }}
                  onAddGoalClick={handleOpenAddGoalSheet}
                  onAddFundsToGoal={handleOpenAddFundsSheet}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3 sm:space-y-4">
             {expensesForSelectedMonthYear.length === 0 && !isLoadingData ? (
                <Card className="shadow-lg h-[200px] xs:h-[230px] sm:h-[288px] flex items-center justify-center text-center text-muted-foreground p-3 sm:p-4">
                   <div><BarChart3 className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 xs:mb-3 sm:mb-4 mx-auto" /><p className="text-xs xs:text-sm sm:text-base">Your expense chart will appear here.</p></div>
                </Card>
              ) : (
                <ExpenseChart expenses={expensesForSelectedMonthYear} currency={userProfileSettings.selected_currency} onCategoryClick={handleCategoryChartClick} selectedCategory={selectedPieCategory} />
              )}
            {appMode === 'authenticated' && user ? (
                <SmartTipCard tipData={financialTip} onRefreshTip={fetchNewTip} isLoading={isLoadingTip} />
            ) : (
                <Card className="shadow-lg">
                    <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-center gap-2"> <Info className="h-5 w-5 sm:h-6 text-accent" /> <CardTitle className="font-headline text-accent text-base sm:text-xl">Smart Tip</CardTitle></div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0"><p className="text-muted-foreground text-xs sm:text-sm">Sign up or log in to receive personalized financial tips!</p></CardContent>
                </Card>
            )}
          </div>
        </div>
      </main>

      <AppFooter onExportClick={handleExportSummary} onImportClick={handleImportCSV} />

      {(appMode === 'authenticated' || appMode === 'guest') && isAddExpenseSheetOpen && (
        <AddExpenseSheet isOpen={isAddExpenseSheetOpen} setIsOpen={(isOpen) => { setIsAddExpenseSheetOpen(isOpen); if (!isOpen) setExpenseToEdit(null); }}
          onSaveExpense={handleSaveExpense} currency={userProfileSettings.selected_currency} expenseToEdit={expenseToEdit} />
      )}
      {(appMode === 'authenticated' || appMode === 'guest') && isAddSavingsGoalSheetOpen && (
        <AddSavingsGoalSheet isOpen={isAddSavingsGoalSheetOpen} setIsOpen={(isOpen) => { setIsAddSavingsGoalSheetOpen(isOpen); if(!isOpen) setGoalToEdit(null);}}
          onSaveGoal={handleSaveSavingsGoal} currency={userProfileSettings.selected_currency} goalToEdit={goalToEdit} />
      )}
       {(appMode === 'authenticated' || appMode === 'guest') && isAddFundsSheetOpen && (
        <AddFundsToGoalSheet isOpen={isAddFundsSheetOpen} setIsOpen={(isOpen) => { setIsAddFundsSheetOpen(isOpen); if(!isOpen) setGoalToAddTo(null);}}
          onSaveFunds={handleSaveAddedFunds} goal={goalToAddTo} currency={userProfileSettings.selected_currency} />
      )}
      {(appMode === 'authenticated' || appMode === 'guest') && isDeleteExpenseDialogOpen && (
        <DeleteExpenseDialog isOpen={isDeleteExpenseDialogOpen} onOpenChange={setIsDeleteExpenseDialogOpen} onConfirmDelete={confirmDeleteExpense}
          itemName={expenses.find(e=>e.id === expenseIdToDelete)?.description || "this expense"} />
      )}
      {(appMode === 'authenticated' || appMode === 'guest') && isDeleteSavingsGoalDialogOpen && (
         <DeleteSavingsGoalDialog isOpen={isDeleteSavingsGoalDialogOpen} onOpenChange={setIsDeleteSavingsGoalDialogOpen} onConfirmDelete={confirmDeleteSavingsGoal} goalName={goalNameToDelete} />
      )}
    </div>
  );
}
