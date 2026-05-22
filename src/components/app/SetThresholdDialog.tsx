'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiggyBank } from 'lucide-react';
import { type CurrencyCode } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';

interface SetThresholdDialogProps {
  currentThreshold: number | null;
  onSetThreshold: (threshold: number | null) => void;
  currency: CurrencyCode;
}

export default function SetThresholdDialog({ currentThreshold, onSetThreshold, currency }: SetThresholdDialogProps) {
  const [threshold, setThreshold] = useState<string>(currentThreshold?.toString() || '');

  const handleSave = () => {
    const numericThreshold = parseFloat(threshold);
    if (!isNaN(numericThreshold) && numericThreshold > 0) {
      onSetThreshold(numericThreshold);
    } else if (threshold === '') {
      onSetThreshold(null);
    }
  };

  return (
    <Dialog onOpenChange={(isOpen) => { if (isOpen) setThreshold(currentThreshold?.toString() || ''); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <PiggyBank className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Budget</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-xl sm:rounded-lg max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Monthly Budget</DialogTitle>
          <DialogDescription className="text-xs">
            Set a spending limit. Leave blank to remove it.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-1.5">
            <Label htmlFor="threshold" className="text-xs font-medium">Amount ({getCurrencySymbol(currency)})</Label>
            <Input
              id="threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g., 500"
              className="h-11"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10 flex-1">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="submit" onClick={handleSave} className="h-10 flex-1 bg-primary hover:bg-primary/90">Save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
