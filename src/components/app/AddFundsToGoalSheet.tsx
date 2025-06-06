
'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { cn, getCurrencySymbol, formatCurrency } from '@/lib/utils';
import { Loader2, Coins } from 'lucide-react';
import type { SavingsGoal, CurrencyCode } from '@/types';
import { useToast } from '@/hooks/use-toast';

const addFundsFormSchema = z.object({
  amountToAdd: z.coerce.number().positive({ message: 'Amount must be positive.' }),
});

export type AddFundsFormData = z.infer<typeof addFundsFormSchema>;

interface AddFundsToGoalSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onSaveFunds: (goalId: string, amountToAdd: number) => Promise<void>;
  goal: SavingsGoal | null;
  currency: CurrencyCode;
}

export default function AddFundsToGoalSheet({
  isOpen,
  setIsOpen,
  onSaveFunds,
  goal,
  currency,
}: AddFundsToGoalSheetProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<AddFundsFormData>({
    resolver: zodResolver(addFundsFormSchema),
    defaultValues: {
      amountToAdd: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ amountToAdd: undefined });
    }
  }, [isOpen, form]);

  if (!goal) return null;

  const onSubmit = async (data: AddFundsFormData) => {
    setIsSaving(true);
    try {
      if (goal.current_amount + data.amountToAdd > goal.target_amount) {
        toast({
            title: "Amount Exceeds Target",
            description: `Adding ${formatCurrency(data.amountToAdd, currency)} would exceed your goal target of ${formatCurrency(goal.target_amount, currency)}. Please adjust the amount.`,
            variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      await onSaveFunds(goal.id, data.amountToAdd);
      setIsOpen(false);
    } catch (error) {
      console.error("Error in AddFundsToGoalSheet onSubmit:", error);
      // Toast for error is handled in page.tsx's onSaveFunds
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg w-[90vw]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Add Funds to "{goal.goal_name}"
          </SheetTitle>
          <SheetDescription>
            Contribute more towards your savings goal. Current progress is shown below.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-3">
            <div>
                <Label className="text-sm text-muted-foreground">Current Progress</Label>
                <Progress value={progressPercentage} className="h-3 mt-1" />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                    {formatCurrency(goal.current_amount, currency)} / {formatCurrency(goal.target_amount, currency)}
                </p>
            </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="amountToAdd">Amount to Add ({getCurrencySymbol(currency)})</Label>
            <Input id="amountToAdd" type="number" step="0.01" {...form.register('amountToAdd')} placeholder="e.g., 50.00" />
            {form.formState.errors.amountToAdd && <p className="text-sm text-destructive">{form.formState.errors.amountToAdd.message}</p>}
          </div>

          <SheetFooter className="mt-6 space-y-2 sm:space-y-0">
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isSaving || form.formState.isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Funds
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
