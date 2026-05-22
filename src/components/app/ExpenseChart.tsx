'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { Expense, CurrencyCode, ExpenseCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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

function ExpenseChart({ expenses, currency, onCategoryClick, selectedCategory }: ExpenseChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name: name as ExpenseCategory,
      value,
    }));
  }, [expenses]);

  const handlePieClick = useCallback((data: any) => {
    if (data && data.name) {
      const category = data.name as ExpenseCategory;
      onCategoryClick(category === selectedCategory ? null : category);
    }
  }, [onCategoryClick, selectedCategory]);

  const outerRadius = Math.max(60, Math.min(containerWidth * 0.32, 110));
  const innerRadius = Math.max(30, Math.min(containerWidth * 0.16, 55));

  if (expenses.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
          <PieChartIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No data available.</p>
          <p className="text-xs mt-1">Add expenses to see your breakdown.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold">Breakdown</CardTitle>
        <CardDescription className="text-xs">Click a slice to filter expenses.</CardDescription>
      </CardHeader>
      <CardContent className="p-2 pt-0" ref={containerRef}>
        <ResponsiveContainer width="100%" height={260}>
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
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
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
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

export default React.memo(ExpenseChart);
