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
  prompt: `Vous êtes un analyste logistique expert. Analysez les données de livraison suivantes, qui sont au format CSV. Votre réponse doit être en français.

  {{deliveryData}}

  Fournissez une analyse détaillée des métriques de performance de livraison (taux de réussite, délai moyen) ventilées par dépôt. Identifiez les dépôts sous-performants et suggérez les raisons potentielles de leur sous-performance, telles que des problèmes de personnel, des défis logistiques ou des facteurs externes comme le trafic ou la météo. Concentrez votre analyse sur la corrélation des livraisons en retard avec des dépôts spécifiques pour identifier les zones à problèmes. Soyez aussi précis que possible dans votre analyse.`,
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
