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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn, getCurrencySymbol } from '@/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Expense, type CurrencyCode } from '@/types';

const expenseFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
  category: z.enum(EXPENSE_CATEGORIES, { required_error: 'Category is required.' }),
  date: z.date({ required_error: 'Date is required.' }),
  description: z.string().min(1, { message: 'Description is required.' }).max(100, { message: 'Description too long.' }),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface AddExpenseSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onSaveExpense: (expenseData: ExpenseFormData) => Promise<void>;
  currency: CurrencyCode;
  expenseToEdit?: Expense | null;
}

export default function AddExpenseSheet({
  isOpen,
  setIsOpen,
  onSaveExpense,
  currency,
  expenseToEdit
}: AddExpenseSheetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!expenseToEdit;

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        form.reset({
          amount: expenseToEdit.amount,
          category: expenseToEdit.category,
          date: typeof expenseToEdit.date === 'string' ? new Date(expenseToEdit.date) : expenseToEdit.date,
          description: expenseToEdit.description,
        });
      } else {
        form.reset({
          date: new Date(),
          description: '',
          amount: undefined,
          category: undefined,
        });
      }
    }
  }, [isOpen, expenseToEdit, form]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSaving(true);
    try {
      await onSaveExpense(data);
      setIsOpen(false);
    } catch (error) {
      console.error("Error in AddExpenseSheet onSubmit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl h-[92dvh] sm:h-auto sm:max-w-md flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">{isEditing ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
          <SheetDescription className="text-xs">
            {isEditing ? 'Update the details below.' : 'Enter your expense details.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-y-auto py-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-medium">Amount ({getCurrencySymbol(currency)})</Label>
            <Input id="amount" type="number" step="0.01" placeholder="0.00" {...form.register('amount')} className="h-11" />
            {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">Description</Label>
            <Textarea id="description" placeholder="What did you spend on?" {...form.register('description')} className="min-h-[80px] resize-none" />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Category</Label>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <SelectTrigger disabled={isSaving} className="h-11">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.category && <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Date</Label>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal h-11", !field.value && "text-muted-foreground")}
                      disabled={isSaving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSaving}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
          </div>

          <div className="flex-1" />

          <SheetFooter className="flex-row gap-2 pt-2 sm:pt-4">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="flex-1 h-11" disabled={isSaving}>Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isSaving || form.formState.isSubmitting} className="flex-1 h-11 bg-primary hover:bg-primary/90">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Save Expense'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
