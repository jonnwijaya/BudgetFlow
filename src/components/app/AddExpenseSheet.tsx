
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
import { CalendarIcon, Wand2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Expense, type CurrencyCode } from '@/types';
import { categorizeExpense as categorizeExpenseAI } from '@/ai/flows/categorize-expense';
import { useToast } from '@/hooks/use-toast';

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
  expenseToEdit?: Expense | null; // Optional prop for editing
}

export default function AddExpenseSheet({ 
  isOpen, 
  setIsOpen, 
  onSaveExpense, 
  currency, 
  expenseToEdit 
}: AddExpenseSheetProps) {
  const { toast } = useToast();
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!expenseToEdit;

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    // Default values will be set by useEffect based on isOpen and expenseToEdit
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
          amount: undefined, // Clears the field, placeholder will show
          category: undefined, // Clears selection
        });
      }
    }
  }, [isOpen, expenseToEdit, form]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSaving(true);
    try {
      await onSaveExpense(data); 
      // form.reset is handled by useEffect when isOpen changes or expenseToEdit changes.
      // No explicit reset here to allow form state to persist until successful save & close.
      setIsOpen(false); 
    } catch (error) {
      console.error("Error in AddExpenseSheet onSubmit:", error);
      // Toast for error is handled in page.tsx's onSaveExpense
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoCategorize = async () => {
    const description = form.getValues('description');
    if (!description) {
      toast({ title: "Categorization Error", description: "Please enter a description first.", variant: "destructive" });
      return;
    }
    setIsCategorizing(true);
    try {
      const result = await categorizeExpenseAI({ description });
      if (result.category) {
        form.setValue('category', result.category as ExpenseCategory, { shouldValidate: true });
        toast({ title: "Auto-categorized!", description: `Expense categorized as ${result.category}.` });
      }
    } catch (error) {
      console.error("AI Categorization Error:", error);
      toast({ title: "Categorization Failed", description: "Could not automatically categorize the expense.", variant: "destructive" });
    } finally {
      setIsCategorizing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg w-[90vw]">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Expense' : 'Add New Expense'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Modify the details of your expense.' : "Fill in the details of your expense. Click save when you're done."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount ({getCurrencySymbol(currency)})</Label>
            <Input id="amount" type="number" step="0.01" {...form.register('amount')} placeholder="e.g., 25.99" />
            {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register('description')} placeholder="e.g., Coffee with friends" />
            {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="category">Category</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleAutoCategorize} disabled={isCategorizing || isSaving}>
                {isCategorizing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
                Suggest
              </Button>
            </div>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ""} >
                  <SelectTrigger disabled={isSaving}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Controller
              control={form.control}
              name="date"
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
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSaving}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>}
          </div>

          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isSaving || isCategorizing || form.formState.isSubmitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {(isSaving || isCategorizing || form.formState.isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Save Expense'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
