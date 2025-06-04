'use client';

import { type FinancialTip } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdPlaceholder from './AdPlaceholder';
import { Lightbulb, RefreshCw, Loader2 } from 'lucide-react';

interface SmartTipCardProps {
  tipData: FinancialTip | null;
  onRefreshTip: () => void;
  isLoading: boolean;
}

export default function SmartTipCard({ tipData, onRefreshTip, isLoading }: SmartTipCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-accent" />
            <CardTitle className="font-headline text-accent">Smart Financial Tip</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onRefreshTip} disabled={isLoading} aria-label="Refresh tip">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        {tipData && <CardDescription>{tipData.reasoning}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !tipData && (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {tipData ? (
          <p className="text-foreground text-base">{tipData.tip}</p>
        ) : (
          !isLoading && <p className="text-muted-foreground">No tip available at the moment. Try refreshing!</p>
        )}
        <AdPlaceholder id="ad-slot-b" label="Sponsored Content" height="h-16" />
      </CardContent>
    </Card>
  );
}
