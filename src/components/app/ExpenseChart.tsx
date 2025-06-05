
'use client';

import { type Expense, type CurrencyCode, type ExpenseCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useMemo, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { PieChartIcon } from 'lucide-react';

interface ExpenseChartProps {
  expenses: Expense[];
  currency: CurrencyCode;
  onCategoryClick: (category: ExpenseCategory | null) => void;
  selectedCategory: ExpenseCategory | null;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#82ca9d',
  '#ffc658',
  '#8884d8',
];


export default function ExpenseChart({ expenses, currency, onCategoryClick, selectedCategory }: ExpenseChartProps) {
  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
    }));
  }, [expenses]);

  const handlePieClick = useCallback((data: any) => {
    if (data && data.name) {
      const category = data.name as ExpenseCategory;
      onCategoryClick(category === selectedCategory ? null : category);
    }
  }, [onCategoryClick, selectedCategory]);

  if (expenses.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="font-headline text-base sm:text-xl"><h2>Expense Breakdown</h2></CardTitle>
          <CardDescription className="text-xs sm:text-sm">No data for the selected period.</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] xs:h-[230px] sm:h-[288px] flex flex-col items-center justify-center text-muted-foreground p-3 sm:p-4">
          <PieChartIcon className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 xs:mb-3 sm:mb-4" />
          <p className="text-xs xs:text-sm text-center">Add expenses or select a different period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="font-headline text-base sm:text-xl"><h2>Expense Breakdown</h2></CardTitle>
        <CardDescription className="text-xs sm:text-sm">Spending distribution by category. Click a slice to filter.</CardDescription>
      </CardHeader>
      <CardContent className="p-1 xs:p-2 sm:p-3">
        <ResponsiveContainer width="100%" height={200} className="xs:!h-[230px] sm:!h-[288px]">
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={window.innerWidth < 400 ? 50 : (window.innerWidth < 640 ? 60 : 80)}
              innerRadius={window.innerWidth < 400 ? 25 : (window.innerWidth < 640 ? 30 : 40)}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              onClick={handlePieClick}
              aria-label="Expense distribution pie chart"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke={COLORS[index % COLORS.length]} 
                  className={selectedCategory === entry.name ? "opacity-100" : (selectedCategory ? "opacity-50" : "opacity-100") + " cursor-pointer focus:outline-none"}
                  tabIndex={0}
                  aria-label={`Category ${entry.name}, amount ${formatCurrency(entry.value, currency)}`}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
              iconSize={8}
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
