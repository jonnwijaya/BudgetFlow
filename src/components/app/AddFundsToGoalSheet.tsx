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
import { getCurrencySymbol, formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
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
    defaultValues: { amountToAdd: undefined },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ amountToAdd: undefined });
    }
  }, [isOpen, form]);

  if (!goal) return null;

  const progressPercentage = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;

  const onSubmit = async (data: AddFundsFormData) => {
    setIsSaving(true);
    try {
      if (goal.current_amount + data.amountToAdd > goal.target_amount) {
        toast({
          title: "Amount Exceeds Target",
          description: `Adding ${formatCurrency(data.amountToAdd, currency)} would exceed your goal of ${formatCurrency(goal.target_amount, currency)}.`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      await onSaveFunds(goal.id, data.amountToAdd);
      setIsOpen(false);
    } catch (error) {
      console.error("Error in AddFundsToGoalSheet onSubmit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl h-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Add Funds</SheetTitle>
          <SheetDescription className="text-xs">
            Contributing to "{goal.goal_name}"
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Current Progress</Label>
            <Progress value={progressPercentage} className="h-2 mt-2" />
            <div className="flex justify-between mt-1">
              <span className="text-xs font-medium">{formatCurrency(goal.current_amount, currency)}</span>
              <span className="text-xs text-muted-foreground">{formatCurrency(goal.target_amount, currency)}</span>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amountToAdd" className="text-xs font-medium">Amount to Add ({getCurrencySymbol(currency)})</Label>
              <Input id="amountToAdd" type="number" step="0.01" placeholder="0.00" {...form.register('amountToAdd')} className="h-11" autoFocus />
              {form.formState.errors.amountToAdd && <p className="text-xs text-destructive">{form.formState.errors.amountToAdd.message}</p>}
            </div>

            <SheetFooter className="flex-row gap-2 pt-2">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="flex-1 h-11" disabled={isSaving}>Cancel</Button>
              </SheetClose>
              <Button type="submit" disabled={isSaving || form.formState.isSubmitting} className="flex-1 h-11 bg-primary hover:bg-primary/90">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Funds
              </Button>
            </SheetFooter>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
