
'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, getCurrencySymbol } from '@/lib/utils';
import { CalendarIcon, Loader2, PiggyBank } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { SavingsGoal, CurrencyCode } from '@/types';
import { useToast } from '@/hooks/use-toast';

const savingsGoalFormSchema = z.object({
  goal_name: z.string().min(1, { message: 'Goal name is required.' }).max(100, { message: 'Goal name too long.' }),
  target_amount: z.coerce.number().positive({ message: 'Target amount must be positive.' }),
  current_amount: z.coerce.number().min(0, {message: 'Current amount cannot be negative.'}),
  target_date: z.date().optional().nullable(),
}).refine(data => data.current_amount <= data.target_amount, {
  message: "Current amount cannot exceed target amount.",
  path: ["current_amount"],
});

export type SavingsGoalFormData = z.infer<typeof savingsGoalFormSchema>;

interface AddSavingsGoalSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onSaveGoal: (goalData: SavingsGoalFormData, goalId?: string) => Promise<void>;
  currency: CurrencyCode;
  goalToEdit?: SavingsGoal | null;
}

export default function AddSavingsGoalSheet({
  isOpen,
  setIsOpen,
  onSaveGoal,
  currency,
  goalToEdit,
}: AddSavingsGoalSheetProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!goalToEdit;

  const form = useForm<SavingsGoalFormData>({
    resolver: zodResolver(savingsGoalFormSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (goalToEdit) {
        form.reset({
          goal_name: goalToEdit.goal_name,
          target_amount: goalToEdit.target_amount,
          current_amount: goalToEdit.current_amount,
          target_date: goalToEdit.target_date ? (typeof goalToEdit.target_date === 'string' ? parseISO(goalToEdit.target_date) : goalToEdit.target_date) : null,
        });
      } else {
        form.reset({
          goal_name: '',
          target_amount: undefined,
          current_amount: 0,
          target_date: null,
        });
      }
    }
  }, [isOpen, goalToEdit, form]);

  const onSubmit = async (data: SavingsGoalFormData) => {
    setIsSaving(true);
    try {
      await onSaveGoal(data, goalToEdit?.id);
      setIsOpen(false);
    } catch (error) {
      console.error("Error in AddSavingsGoalSheet onSubmit:", error);
      // Toast for error is handled in page.tsx's onSaveGoal
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg w-[90vw]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-primary" />
            {isEditing ? 'Edit Savings Goal' : 'Add New Savings Goal'}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? 'Modify the details of your savings goal.' : "Define your savings goal and track your progress."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="goal_name">Goal Name</Label>
            <Input id="goal_name" {...form.register('goal_name')} placeholder="e.g., New Laptop, Vacation Fund" />
            {form.formState.errors.goal_name && <p className="text-sm text-destructive">{form.formState.errors.goal_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="target_amount">Target Amount ({getCurrencySymbol(currency)})</Label>
              <Input id="target_amount" type="number" step="0.01" {...form.register('target_amount')} placeholder="e.g., 1200" />
              {form.formState.errors.target_amount && <p className="text-sm text-destructive">{form.formState.errors.target_amount.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current_amount">Current Amount ({getCurrencySymbol(currency)})</Label>
              <Input id="current_amount" type="number" step="0.01" {...form.register('current_amount')} placeholder="e.g., 150" />
              {form.formState.errors.current_amount && <p className="text-sm text-destructive">{form.formState.errors.current_amount.message}</p>}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="target_date">Target Date (Optional)</Label>
            <Controller
              control={form.control}
              name="target_date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isSaving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={(date) => field.onChange(date || null)}
                      initialFocus
                      disabled={(date) => date < new Date("1900-01-01") || isSaving}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.target_date && <p className="text-sm text-destructive">{form.formState.errors.target_date.message}</p>}
          </div>

          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isSaving || form.formState.isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Save Goal'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
