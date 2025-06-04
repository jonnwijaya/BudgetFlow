
'use client';

import { type Expense, type CurrencyCode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { PieChartIcon } from 'lucide-react';

interface ExpenseChartProps {
  expenses: Expense[];
  currency: CurrencyCode;
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


export default function ExpenseChart({ expenses, currency }: ExpenseChartProps) {
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

  if (expenses.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-headline text-base sm:text-xl"><h2>Expense Breakdown</h2></CardTitle>
          <CardDescription className="text-xs sm:text-sm">No data for the selected period.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] flex flex-col items-center justify-center text-muted-foreground p-3 sm:p-4">
          <PieChartIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
          <p className="text-xs sm:text-sm text-center">Add expenses or select a different period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="font-headline text-base sm:text-xl"><h2>Expense Breakdown</h2></CardTitle>
        <CardDescription className="text-xs sm:text-sm">Spending distribution by category.</CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={window.innerWidth < 640 ? 60 : 70} // Smaller radius for mobile
              innerRadius={window.innerWidth < 640 ? 30 : 35} // Smaller radius for mobile
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              aria-label="Expense distribution pie chart"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
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
