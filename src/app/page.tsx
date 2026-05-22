'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import AppHeader from '@/components/app/Header';
import AppFooter from '@/components/app/Footer';
import ExpenseList from '@/components/app/ExpenseList';
import SavingsGoalList from '@/components/app/SavingsGoalList';

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { AlertTriangle, BarChart3, CalendarDays, Loader2, PiggyBank, PlusCircle, TrendingUp, Wallet, Info } from 'lucide-react';
import type { Expense, CurrencyCode, ExpenseCategory, SavingsGoal, UserProfileSettings } from '@/types';
import { SUPPORTED_CURRENCIES, EXPENSE_CATEGORIES } from '@/types';
import type { ExpenseFormData } from '@/components/app/AddExpenseSheet';
import type { SavingsGoalFormData } from '@/components/app/AddSavingsGoalSheet';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, parse, isValid, getDaysInMonth, getDate } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  getLocalProfileSettings, saveLocalProfileSettings,
  getLocalExpenses, addLocalExpense, updateLocalExpense, deleteLocalExpense, addMultipleLocalExpenses,
  getLocalSavingsGoals, addLocalSavingsGoal, updateLocalSavingsGoal, deleteLocalSavingsGoal
} from '@/lib/localStore';
import { initializeLocalDataIfNotExists } from '@/lib/sampleData';

const AddExpenseSheet = dynamic(() => import('@/components/app/AddExpenseSheet'), {
  ssr: false,
  loading: () => <div className="w-full h-screen fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
});
const AddSavingsGoalSheet = dynamic(() => import('@/components/app/AddSavingsGoalSheet'), {
  ssr: false,
  loading: () => <div className="w-full h-screen fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
});
const AddFundsToGoalSheet = dynamic(() => import('@/components/app/AddFundsToGoalSheet'), {
  ssr: false,
  loading: () => <div className="w-full h-screen fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
});

const ExpenseChart = dynamic(() => import('@/components/app/ExpenseChart'), {
  loading: () => (
    <Card className="border shadow-sm">
      <CardContent className="h-[260px] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm">Loading chart...</p>
      </CardContent>
    </Card>
  ),
  ssr: false,
});
const SetThresholdDialog = dynamic(() => import('@/components/app/SetThresholdDialog'), { ssr: false });
const DeleteExpenseDialog = dynamic(() => import('@/components/app/DeleteExpenseDialog'), { ssr: false });
const DeleteSavingsGoalDialog = dynamic(() => import('@/components/app/DeleteSavingsGoalDialog'), { ssr: false });

const GUEST_WARNING_DISMISSED_KEY = 'budgetflow_guestWarningDismissed_v2';

export default function BudgetFlowPage() {
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);
  const [isAddSavingsGoalSheetOpen, setIsAddSavingsGoalSheetOpen] = useState(false);
  const [isAddFundsSheetOpen, setIsAddFundsSheetOpen] = useState(false);
  const [goalToAddTo, setGoalToAddTo] = useState<SavingsGoal | null>(null);

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
    initializeLocalDataIfNotExists();
    setIsLoadingData(true);
    loadGuestData();
    if (isMounted) setIsLoadingData(false);
    return () => { isMounted = false; };
  }, [loadGuestData]);

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

  const budgetRemaining = userProfileSettings.budget_threshold !== null
    ? userProfileSettings.budget_threshold - totalSpendingForMonth
    : null;

  const budgetExceeded = budgetRemaining !== null && budgetRemaining < 0;

  const totalSavingsTarget = useMemo(() => savingsGoals.reduce((sum, g) => sum + g.target_amount, 0), [savingsGoals]);
  const totalSavingsCurrent = useMemo(() => savingsGoals.reduce((sum, g) => sum + g.current_amount, 0), [savingsGoals]);
  const savingsProgressPercent = totalSavingsTarget > 0 ? Math.round((totalSavingsCurrent / totalSavingsTarget) * 100) : 0;

  const monthlyProjection = useMemo(() => {
    const today = new Date();
    const isCurrentMonthView = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

    if (!isCurrentMonthView || !userProfileSettings.budget_threshold || today.getDate() < 7) {
      return { show: false, projectedSpending: 0, overspendAmount: 0, spentSoFar: 0, currentDay: 0 };
    }

    const _currentDayOfMonth = getDate(today);
    const daysInCurrentMonth = getDaysInMonth(today);

    const _spentSoFarThisMonth = expenses
      .filter(exp => {
        const expenseDate = new Date(exp.date);
        return expenseDate.getFullYear() === selectedYear &&
               expenseDate.getMonth() === selectedMonth &&
               getDate(expenseDate) <= _currentDayOfMonth;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    if (_currentDayOfMonth === 0 || _spentSoFarThisMonth === 0) {
      return { show: false, projectedSpending: 0, overspendAmount: 0, spentSoFar: 0, currentDay: 0 };
    }

    const averageDailySpending = _spentSoFarThisMonth / _currentDayOfMonth;
    const _projectedMonthlySpending = averageDailySpending * daysInCurrentMonth;

    if (userProfileSettings.budget_threshold === null) {
      return { show: false, projectedSpending: 0, overspendAmount: 0, spentSoFar: 0, currentDay: 0 };
    }
    const _projectedOverspendAmount = _projectedMonthlySpending - userProfileSettings.budget_threshold;

    return {
      show: _projectedOverspendAmount > 0,
      projectedSpending: _projectedMonthlySpending,
      overspendAmount: _projectedOverspendAmount,
      spentSoFar: _spentSoFarThisMonth,
      currentDay: _currentDayOfMonth,
    };
  }, [expenses, selectedMonth, selectedYear, userProfileSettings.budget_threshold]);

  const handleSaveExpense = useCallback(async (expenseData: ExpenseFormData) => {
    if (expenseToEdit) {
      const updated = updateLocalExpense({
        ...expenseToEdit,
        ...expenseData,
        date: expenseData.date,
        updated_at: new Date().toISOString(),
      });
      if (updated) {
        setExpenses(getLocalExpenses());
        toast({ title: "Expense Updated" });
      }
    } else {
      addLocalExpense(expenseData);
      setExpenses(getLocalExpenses());
      toast({ title: "Expense Added" });
    }
    setExpenseToEdit(null);
  }, [toast, expenseToEdit]);

  const handleSaveSavingsGoal = useCallback(async (goalData: SavingsGoalFormData, goalId?: string) => {
    if (goalId && goalToEdit) {
      const updated = updateLocalSavingsGoal({
        ...goalToEdit,
        ...goalData,
        target_date: goalData.target_date,
        updated_at: new Date().toISOString(),
      });
      if (updated) {
        setSavingsGoals(getLocalSavingsGoals());
        toast({ title: "Goal Updated" });
      }
    } else {
      addLocalSavingsGoal(goalData);
      setSavingsGoals(getLocalSavingsGoals());
      toast({ title: "Goal Added" });
    }
    setGoalToEdit(null);
  }, [toast, goalToEdit]);

  const handleOpenAddFundsSheet = useCallback((goal: SavingsGoal) => {
    setGoalToAddTo(goal);
    setIsAddFundsSheetOpen(true);
  }, []);

  const handleSaveAddedFunds = useCallback(async (goalId: string, amountToAdd: number) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (goal) {
      const newCurrentAmount = Math.min(goal.current_amount + amountToAdd, goal.target_amount);
      updateLocalSavingsGoal({ ...goal, current_amount: newCurrentAmount, updated_at: new Date().toISOString() });
      setSavingsGoals(getLocalSavingsGoals());
      toast({ title: "Funds Added" });
    }
  }, [toast, savingsGoals]);

  const handleEditExpenseClick = useCallback((expense: Expense) => { setExpenseToEdit(expense); setIsAddExpenseSheetOpen(true); }, []);
  const handleEditGoalClick = useCallback((goal: SavingsGoal) => { setGoalToEdit(goal); setIsAddSavingsGoalSheetOpen(true); }, []);
  const handleDeleteExpenseClick = useCallback((id: string) => { setExpenseIdToDelete(id); setIsDeleteExpenseDialogOpen(true); }, []);
  const handleDeleteGoalClick = useCallback((goal: SavingsGoal) => { setGoalIdToDelete(goal.id); setGoalNameToDelete(goal.goal_name); setIsDeleteSavingsGoalDialogOpen(true); }, []);

  const confirmDeleteExpense = useCallback(async () => {
    if (!expenseIdToDelete) return;
    deleteLocalExpense(expenseIdToDelete);
    setExpenses(getLocalExpenses());
    toast({ title: "Expense Deleted" });
    setIsDeleteExpenseDialogOpen(false); setExpenseIdToDelete(null);
  }, [expenseIdToDelete, toast]);

  const confirmDeleteSavingsGoal = useCallback(async () => {
    if (!goalIdToDelete) return;
    deleteLocalSavingsGoal(goalIdToDelete);
    setSavingsGoals(getLocalSavingsGoals());
    toast({ title: "Goal Deleted" });
    setIsDeleteSavingsGoalDialogOpen(false); setGoalIdToDelete(null); setGoalNameToDelete(undefined);
  }, [goalIdToDelete, toast]);

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

        let parsedDate: Date | null = null;
        const dateFormatsToTry = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy/MM/dd'];
        for (const fmt of dateFormatsToTry) {
          const dt = parse(dateStr, fmt, new Date());
          if (isValid(dt)) { parsedDate = dt; break; }
        }
        if (!parsedDate) { failedRowCount++; continue; }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) { failedRowCount++; continue; }
        if (!descriptionStr) { failedRowCount++; continue; }

        const category = EXPENSE_CATEGORIES.find(cat => cat.toLowerCase() === categoryStr.toLowerCase()) as ExpenseCategory | undefined;
        if (!category) { failedRowCount++; continue; }

        importedExpenses.push({ date: parsedDate, category, description: descriptionStr, amount });
      }

      if (importedExpenses.length > 0) {
        addMultipleLocalExpenses(importedExpenses);
        setExpenses(getLocalExpenses());
      }

      let toastMessage = "";
      if (importedExpenses.length > 0) toastMessage += `${importedExpenses.length} expenses imported. `;
      if (failedRowCount > 0) toastMessage += `${failedRowCount} rows failed.`;
      if (!toastMessage) toastMessage = "No valid expenses found.";
      toast({ title: "Import Complete", description: toastMessage, duration: 5000 });
    };
    reader.onerror = () => { toast({ title: "Import Error", description: "Failed to read the file.", variant: "destructive" }); };
    reader.readAsText(file);
  }, [toast]);

  const handleSetThreshold = useCallback(async (newThreshold: number | null) => {
    const currentSettings = getLocalProfileSettings();
    saveLocalProfileSettings({ ...currentSettings, budget_threshold: newThreshold });
    setUserProfileSettings({ ...currentSettings, budget_threshold: newThreshold });
    toast({ title: newThreshold !== null ? "Budget Set" : "Budget Cleared" });
  }, [toast]);

  const handleCurrencyChange = useCallback(async (newCurrency: CurrencyCode) => {
    const currentSettings = getLocalProfileSettings();
    saveLocalProfileSettings({ ...currentSettings, selected_currency: newCurrency });
    setUserProfileSettings({ ...currentSettings, selected_currency: newCurrency });
    toast({ title: "Currency Updated" });
  }, [toast]);

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

  const handleClearPieCategoryFilter = useCallback(() => {
    setSelectedPieCategory(null);
  }, []);

  const handleDismissGuestWarning = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_WARNING_DISMISSED_KEY, 'true');
    }
    setShowGuestWarning(false);
  }, []);

  if (isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-sm text-muted-foreground">Loading your data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader
        onAddExpenseClick={handleOpenAddExpenseSheet}
        selectedCurrency={userProfileSettings.selected_currency}
        onCurrencyChange={handleCurrencyChange}
        currencies={SUPPORTED_CURRENCIES}
      />

      <main className="flex-grow container mx-auto px-4 py-4 space-y-4">
        {showGuestWarning && (
          <Alert className="bg-primary/5 border-primary/20 text-primary animate-fade-in">
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3 text-sm">
              <span>Your data is stored locally in this browser.</span>
              <Button onClick={handleDismissGuestWarning} variant="ghost" size="sm" className="h-7 text-xs shrink-0">
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {budgetExceeded && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Over budget by {formatCurrency(Math.abs(budgetRemaining!), userProfileSettings.selected_currency)} for {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}.
            </AlertDescription>
          </Alert>
        )}

        {monthlyProjection.show && userProfileSettings.budget_threshold && (
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 animate-fade-in">
            <TrendingUp className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Projected to spend {formatCurrency(monthlyProjection.projectedSpending, userProfileSettings.selected_currency)} — {formatCurrency(monthlyProjection.overspendAmount, userProfileSettings.selected_currency)} over budget.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Spent</p>
              <p className="text-sm sm:text-lg font-semibold mt-0.5 truncate">{formatCurrency(totalSpendingForMonth, userProfileSettings.selected_currency)}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{budgetRemaining !== null ? (budgetRemaining < 0 ? 'Over' : 'Left') : 'Budget'}</p>
              <p className={`text-sm sm:text-lg font-semibold mt-0.5 truncate ${budgetRemaining !== null && budgetRemaining < 0 ? 'text-destructive' : ''}`}>
                {budgetRemaining !== null ? formatCurrency(Math.abs(budgetRemaining), userProfileSettings.selected_currency) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Savings</p>
              <p className="text-sm sm:text-lg font-semibold mt-0.5 truncate">{savingsProgressPercent}%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Expenses Card */}
            <Card className="border shadow-sm">
              <CardHeader className="p-4 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Expenses</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <Select value={selectedMonth.toString()} onValueChange={(value) => { setSelectedMonth(parseInt(value)); setSelectedPieCategory(null); }}>
                        <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 12 }, (_, i) => (<SelectItem key={i} value={i.toString()} className="text-xs">{format(new Date(selectedYear, i), 'MMMM')}</SelectItem>))}</SelectContent>
                      </Select>
                      <Select value={selectedYear.toString()} onValueChange={(value) => { setSelectedYear(parseInt(value)); setSelectedPieCategory(null); }}>
                        <SelectTrigger className="h-8 text-xs w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{availableYears.map(year => (<SelectItem key={year} value={year.toString()} className="text-xs">{year}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <SetThresholdDialog currentThreshold={userProfileSettings.budget_threshold} onSetThreshold={handleSetThreshold} currency={userProfileSettings.selected_currency} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredExpensesToList.length === 0 && !selectedPieCategory ? (
                  <div className="text-center text-muted-foreground py-10 min-h-[200px] flex flex-col items-center justify-center">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium">No expenses for this period.</p>
                    <p className="text-xs mt-1">Add expenses or change the date range.</p>
                    <Button onClick={handleOpenAddExpenseSheet} size="sm" className="mt-4 h-8 text-xs bg-primary hover:bg-primary/90">
                      <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Expense
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] sm:h-[340px] rounded-b-lg">
                    <ExpenseList
                      expenses={filteredExpensesToList}
                      currency={userProfileSettings.selected_currency}
                      onEditExpense={handleEditExpenseClick}
                      onDeleteExpense={handleDeleteExpenseClick}
                      selectedPieCategory={selectedPieCategory}
                      onClearPieCategoryFilter={handleClearPieCategoryFilter}
                      totalFilteredExpenses={totalDisplayedInList}
                    />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Savings Goals Card */}
            <Card className="border shadow-sm">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Savings Goals</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleOpenAddGoalSheet} className="h-8 text-xs">
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Goal
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <SavingsGoalList
                  goals={savingsGoals}
                  currency={userProfileSettings.selected_currency}
                  onEditGoal={handleEditGoalClick}
                  onDeleteGoal={(goalId) => { const goal = savingsGoals.find(g => g.id === goalId); if (goal) handleDeleteGoalClick(goal); }}
                  onAddGoalClick={handleOpenAddGoalSheet}
                  onAddFundsToGoal={handleOpenAddFundsSheet}
                />
              </CardContent>
            </Card>
          </div>

          {/* Chart Column */}
          <div className="space-y-4">
            {expensesForSelectedMonthYear.length === 0 && !isLoadingData ? (
              <Card className="border shadow-sm h-[280px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <Wallet className="h-10 w-10 text-muted-foreground/40 mb-3 mx-auto" />
                  <p className="text-sm font-medium">No data to visualize.</p>
                  <p className="text-xs mt-1">Add expenses to see your breakdown.</p>
                </div>
              </Card>
            ) : (
              <ExpenseChart expenses={expensesForSelectedMonthYear} currency={userProfileSettings.selected_currency} onCategoryClick={handleCategoryChartClick} selectedCategory={selectedPieCategory} />
            )}
          </div>
        </div>
      </main>

      <AppFooter onExportClick={handleExportSummary} onImportClick={handleImportCSV} />

      {isAddExpenseSheetOpen && (
        <AddExpenseSheet isOpen={isAddExpenseSheetOpen} setIsOpen={(isOpen) => { setIsAddExpenseSheetOpen(isOpen); if (!isOpen) setExpenseToEdit(null); }}
          onSaveExpense={handleSaveExpense} currency={userProfileSettings.selected_currency} expenseToEdit={expenseToEdit} />
      )}
      {isAddSavingsGoalSheetOpen && (
        <AddSavingsGoalSheet isOpen={isAddSavingsGoalSheetOpen} setIsOpen={(isOpen) => { setIsAddSavingsGoalSheetOpen(isOpen); if (!isOpen) setGoalToEdit(null); }}
          onSaveGoal={handleSaveSavingsGoal} currency={userProfileSettings.selected_currency} goalToEdit={goalToEdit} />
      )}
      {isAddFundsSheetOpen && (
        <AddFundsToGoalSheet isOpen={isAddFundsSheetOpen} setIsOpen={(isOpen) => { setIsAddFundsSheetOpen(isOpen); if (!isOpen) setGoalToAddTo(null); }}
          onSaveFunds={handleSaveAddedFunds} goal={goalToAddTo} currency={userProfileSettings.selected_currency} />
      )}
      {isDeleteExpenseDialogOpen && (
        <DeleteExpenseDialog isOpen={isDeleteExpenseDialogOpen} onOpenChange={setIsDeleteExpenseDialogOpen} onConfirmDelete={confirmDeleteExpense}
          itemName={expenses.find(e => e.id === expenseIdToDelete)?.description || "this expense"} />
      )}
      {isDeleteSavingsGoalDialogOpen && (
        <DeleteSavingsGoalDialog isOpen={isDeleteSavingsGoalDialogOpen} onOpenChange={setIsDeleteSavingsGoalDialogOpen} onConfirmDelete={confirmDeleteSavingsGoal} goalName={goalNameToDelete} />
      )}
    </div>
  );
}
