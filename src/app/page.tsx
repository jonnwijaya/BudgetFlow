'use client';

import { useState, useEffect, useCallback } from 'react';
import AppHeader from '@/components/app/Header';
import AppFooter from '@/components/app/Footer';
import AddExpenseSheet from '@/components/app/AddExpenseSheet';
import ExpenseList from '@/components/app/ExpenseList';
import ExpenseChart from '@/components/app/ExpenseChart';
import SmartTipCard from '@/components/app/SmartTipCard';
import AdPlaceholder from '@/components/app/AdPlaceholder';
import SetThresholdDialog from '@/components/app/SetThresholdDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { type Expense, type FinancialTip, type ExpenseCategory } from '@/types';
import { generateFinancialTip } from '@/ai/flows/generate-financial-tip';
import { useToast } from '@/hooks/use-toast';

export default function BudgetFlowPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);
  const [financialTip, setFinancialTip] = useState<FinancialTip | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);
  const [budgetThreshold, setBudgetThreshold] = useState<number | null>(null);
  const { toast } = useToast();

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budgetExceeded = budgetThreshold !== null && totalSpent > budgetThreshold;

  const fetchNewTip = useCallback(async () => {
    setIsLoadingTip(true);
    try {
      const tipInput = {
        financialSituation: "User is tracking expenses and wants to improve their financial habits.",
        riskTolerance: "Moderate",
        investmentInterests: "Saving money, budgeting effectively, understanding basic financial concepts."
      };
      const tip = await generateFinancialTip(tipInput);
      setFinancialTip(tip);
    } catch (error) {
      console.error("Error fetching financial tip:", error);
      toast({
        title: "Error",
        description: "Could not fetch a new financial tip. Please try again later.",
        variant: "destructive",
      });
      setFinancialTip(null); // Clear previous tip on error
    } finally {
      setIsLoadingTip(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNewTip();
  }, [fetchNewTip]);

  const handleSaveExpense = (newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...newExpenseData,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // Simple unique ID
    };
    setExpenses(prevExpenses => [newExpense, ...prevExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleExportSummary = () => {
    if (expenses.length === 0) {
      toast({ title: "No Data", description: "No expenses to export.", variant: "default" });
      return;
    }
    const headers = "ID,Date,Category,Description,Amount\n";
    const csvContent = expenses.map(e => 
      `${e.id},${e.date.toISOString().split('T')[0]},${e.category},"${e.description.replace(/"/g, '""')}",${e.amount.toFixed(2)}`
    ).join("\n");
    const fullCsv = headers + csvContent;
    
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "budgetflow_summary.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: "Your expense summary has been downloaded." });
    } else {
       toast({ title: "Export Failed", description: "Your browser does not support this feature.", variant: "destructive" });
    }
  };

  const handleSetThreshold = (threshold: number | null) => {
    setBudgetThreshold(threshold);
    if (threshold !== null) {
      toast({ title: "Budget Set", description: `Budget threshold set to $${threshold.toFixed(2)}.` });
    } else {
      toast({ title: "Budget Cleared", description: "Budget threshold has been removed." });
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader 
        onAddExpenseClick={() => setIsAddExpenseSheetOpen(true)} 
        totalSpent={totalSpent}
        budgetThreshold={budgetThreshold}
      />

      <main className="flex-grow container mx-auto p-4 md:p-6 space-y-6">
        {budgetExceeded && (
          <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Budget Exceeded!</AlertTitle>
            <AlertDescription>
              You have spent ${totalSpent.toFixed(2)}, which is over your budget of ${budgetThreshold?.toFixed(2)}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <CardTitle className="font-headline">Recent Expenses</CardTitle>
                </div>
                <SetThresholdDialog currentThreshold={budgetThreshold} onSetThreshold={handleSetThreshold} />
              </CardHeader>
              <CardContent>
                <ExpenseList expenses={expenses} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <ExpenseChart expenses={expenses} />
            <SmartTipCard tipData={financialTip} onRefreshTip={fetchNewTip} isLoading={isLoadingTip} />
          </div>
        </div>
        
        <AdPlaceholder id="ad-slot-a" label="Your Advertisement Here - Boost Your Savings!" className="mt-6 sticky bottom-0 bg-card p-4 shadow-lg" height="h-20 md:h-24"/>
      
      </main>

      <AppFooter onExportClick={handleExportSummary} />

      <AddExpenseSheet 
        isOpen={isAddExpenseSheetOpen} 
        setIsOpen={setIsAddExpenseSheetOpen} 
        onSaveExpense={handleSaveExpense} 
      />
    </div>
  );
}
