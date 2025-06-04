'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating personalized financial tips.
 *
 * - generateFinancialTip - A function that generates financial tips based on user data.
 * - GenerateFinancialTipInput - The input type for the generateFinancialTip function.
 * - GenerateFinancialTipOutput - The return type for the generateFinancialTip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFinancialTipInputSchema = z.object({
  financialSituation: z
    .string()
    .describe("The user's current financial situation, including income, expenses, debts, and savings goals."),
  riskTolerance: z
    .string()
    .describe('The users risk tolerance when it comes to financial decision making.'),
  investmentInterests: z
    .string()
    .describe('The users interest in various investment strategies.'),
});
export type GenerateFinancialTipInput = z.infer<typeof GenerateFinancialTipInputSchema>;

const GenerateFinancialTipOutputSchema = z.object({
  tip: z.string().describe('A personalized financial tip for the user.'),
  reasoning: z.string().describe('Explanation of why the tip is applicable to the user.'),
});
export type GenerateFinancialTipOutput = z.infer<typeof GenerateFinancialTipOutputSchema>;

export async function generateFinancialTip(input: GenerateFinancialTipInput): Promise<GenerateFinancialTipOutput> {
  return generateFinancialTipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialTipPrompt',
  input: {schema: GenerateFinancialTipInputSchema},
  output: {schema: GenerateFinancialTipOutputSchema},
  prompt: `You are an expert financial advisor. Generate a personalized financial tip for the user based on their financial situation, risk tolerance and investment interests.  Also provide a brief explanation of why the tip is applicable to the user.

Financial Situation: {{{financialSituation}}}
Risk Tolerance: {{{riskTolerance}}}
Investment Interests: {{{investmentInterests}}}

Tip: 
Reasoning:`,
});

const generateFinancialTipFlow = ai.defineFlow(
  {
    name: 'generateFinancialTipFlow',
    inputSchema: GenerateFinancialTipInputSchema,
    outputSchema: GenerateFinancialTipOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
