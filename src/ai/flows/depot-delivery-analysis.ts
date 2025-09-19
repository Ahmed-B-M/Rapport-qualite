// src/ai/flows/depot-delivery-analysis.ts
'use server';

/**
 * @fileOverview Analyzes delivery data to provide insights into depot-level delivery performance.
 *
 * - analyzeDepotDelivery - A function that analyzes delivery data by depot.
 * - AnalyzeDepotDeliveryInput - The input type for the analyzeDepotDelivery function.
 * - AnalyzeDepotDeliveryOutput - The return type for the analyzeDepotDelivery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDepotDeliveryInputSchema = z.object({
  deliveryData: z
    .string()
    .describe('A string containing delivery data in CSV format.'),
});
export type AnalyzeDepotDeliveryInput = z.infer<typeof AnalyzeDepotDeliveryInputSchema>;

const AnalyzeDepotDeliveryOutputSchema = z.object({
  analysisResults: z
    .string()
    .describe(
      'A detailed analysis of delivery performance metrics (success rate, average delay) broken down by depot, including potential reasons for underperformance.'
    ),
});
export type AnalyzeDepotDeliveryOutput = z.infer<typeof AnalyzeDepotDeliveryOutputSchema>;

export async function analyzeDepotDelivery(
  input: AnalyzeDepotDeliveryInput
): Promise<AnalyzeDepotDeliveryOutput> {
  return analyzeDepotDeliveryFlow(input);
}

const analyzeDepotDeliveryPrompt = ai.definePrompt({
  name: 'analyzeDepotDeliveryPrompt',
  input: {schema: AnalyzeDepotDeliveryInputSchema},
  output: {schema: AnalyzeDepotDeliveryOutputSchema},
  prompt: `You are an expert logistics analyst. Analyze the following delivery data, which is in CSV format:

  {{deliveryData}}

  Provide a detailed analysis of delivery performance metrics (success rate, average delay) broken down by depot.  Identify any depots that are underperforming and suggest potential reasons for their underperformance, such as staffing issues, logistical challenges, or external factors like traffic or weather. Focus your analysis on correlating late deliveries with specific depots to pinpoint problem areas. Be as specific as possible in your analysis.`,
});

const analyzeDepotDeliveryFlow = ai.defineFlow(
  {
    name: 'analyzeDepotDeliveryFlow',
    inputSchema: AnalyzeDepotDeliveryInputSchema,
    outputSchema: AnalyzeDepotDeliveryOutputSchema,
  },
  async input => {
    const {output} = await analyzeDepotDeliveryPrompt(input);
    return output!;
  }
);
