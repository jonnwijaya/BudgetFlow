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

interface SetThresholdDialogProps {
  currentThreshold: number | null;
  onSetThreshold: (threshold: number | null) => void;
}

export default function SetThresholdDialog({ currentThreshold, onSetThreshold }: SetThresholdDialogProps) {
  const [threshold, setThreshold] = useState<string>(currentThreshold?.toString() || '');

  const handleSave = () => {
    const numericThreshold = parseFloat(threshold);
    if (!isNaN(numericThreshold) && numericThreshold > 0) {
      onSetThreshold(numericThreshold);
    } else if (threshold === '') {
      onSetThreshold(null); // Clear threshold
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PiggyBank className="mr-2 h-4 w-4" /> Set Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Budget Threshold</DialogTitle>
          <DialogDescription>
            Set a monthly budget threshold. You'll be notified if your spending exceeds this amount. Leave blank to remove threshold.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="threshold" className="text-right">
              Amount ($)
            </Label>
            <Input
              id="threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g., 500"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="submit" onClick={handleSave}>Save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
