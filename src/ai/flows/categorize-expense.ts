'use server';

/**
 * @fileOverview Expense categorization AI agent.
 *
 * - categorizeExpense - A function that handles the expense categorization process.
 * - CategorizeExpenseInput - The input type for the categorizeExpense function.
 * - CategorizeExpenseOutput - The return type for the categorizeExpense function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const expenseCategories = [
  'Food',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Travel',
  'Healthcare',
  'Education',
  'Other',
] as const;

const CategorizeExpenseInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

const CategorizeExpenseOutputSchema = z.object({
  category: z
    .enum(expenseCategories)
    .describe('The category the expense falls into.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'A number between 0 and 1 indicating the confidence level in the categorization.'
    ),
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

export async function categorizeExpense(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  return categorizeExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: {schema: CategorizeExpenseInputSchema},
  output: {schema: CategorizeExpenseOutputSchema},
  prompt: `You are an expert personal finance assistant. Given the description of an expense, you will categorize it into one of the following categories: Food, Transportation, Housing, Utilities, Entertainment, Shopping, Travel, Healthcare, Education, Other.

Description: {{{description}}}`,
});

const categorizeExpenseFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
