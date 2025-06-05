
'use client';

import { type FinancialTip } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, RefreshCw, Loader2 } from 'lucide-react';

interface SmartTipCardProps {
  tipData: FinancialTip | null;
  onRefreshTip: () => void;
  isLoading: boolean;
}

export default function SmartTipCard({ tipData, onRefreshTip, isLoading }: SmartTipCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
            <CardTitle className="font-headline text-accent text-base sm:text-xl">Smart Tip</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onRefreshTip} disabled={isLoading} aria-label="Refresh tip" className="h-7 w-7 sm:h-8 sm:w-8">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </Button>
        </div>
        {tipData && <CardDescription className="text-xs sm:text-sm mt-1">{tipData.reasoning}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-4 p-4 sm:p-6 pt-0">
        {isLoading && !tipData && (
          <div className="flex items-center justify-center h-16 sm:h-20">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {tipData ? (
          <p className="text-foreground text-sm sm:text-base">{tipData.tip}</p>
        ) : (
          !isLoading && <p className="text-muted-foreground text-xs sm:text-sm">No tip available. Try refreshing!</p>
        )}
      </CardContent>
    </Card>
  );
}
