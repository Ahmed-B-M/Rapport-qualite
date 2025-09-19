'use server';
/**
 * @fileOverview Analyzes delivery failure modes by carrier and suggests corrective actions.
 *
 * - analyzeCarrierFailureModes - Analyzes delivery failure modes for a given carrier.
 * - AnalyzeCarrierFailureModesInput - The input type for the analyzeCarrierFailureModes function.
 * - AnalyzeCarrierFailureModesOutput - The return type for the analyzeCarrierFailureModes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCarrierFailureModesInputSchema = z.object({
  carrierName: z.string().describe('The name of the delivery carrier to analyze.'),
  deliveryFailureReasons: z
    .array(z.string())
    .describe('A list of delivery failure reasons for the specified carrier.'),
});
export type AnalyzeCarrierFailureModesInput = z.infer<
  typeof AnalyzeCarrierFailureModesInputSchema
>;

const AnalyzeCarrierFailureModesOutputSchema = z.object({
  worstFailureReason: z
    .string()
    .describe(
      'The most common or impactful delivery failure reason for the specified carrier.'
    ),
  analysisSummary: z
    .string()
    .describe('A summary of the analysis of delivery failure modes for the carrier.'),
  correctiveAction: z
    .string()
    .describe('A suggested corrective action to address the worst failure reason.'),
});
export type AnalyzeCarrierFailureModesOutput = z.infer<
  typeof AnalyzeCarrierFailureModesOutputSchema
>;

export async function analyzeCarrierFailureModes(
  input: AnalyzeCarrierFailureModesInput
): Promise<AnalyzeCarrierFailureModesOutput> {
  return analyzeCarrierFailureModesFlow(input);
}

const analyzeCarrierFailureModesPrompt = ai.definePrompt({
  name: 'analyzeCarrierFailureModesPrompt',
  input: {schema: AnalyzeCarrierFailureModesInputSchema},
  output: {schema: AnalyzeCarrierFailureModesOutputSchema},
  prompt: `Vous êtes un analyste logistique expert chargé d'identifier les pires motifs d'échec de livraison et de suggérer des actions correctives. Votre réponse doit être en français.

  Analysez les motifs d'échec de livraison suivants pour le transporteur "{{carrierName}}":
  {{#each deliveryFailureReasons}}- {{{this}}}{{/each}}

  1.  Identifiez le pire motif d'échec en fonction de sa fréquence et de son impact.
  2.  Rédigez un court résumé expliquant pourquoi c'est le pire motif.
  3.  Suggérez une action corrective concrète et réalisable pour réduire ce type d'échec à l'avenir.`,
});

const analyzeCarrierFailureModesFlow = ai.defineFlow(
  {
    name: 'analyzeCarrierFailureModesFlow',
    inputSchema: AnalyzeCarrierFailureModesInputSchema,
    outputSchema: AnalyzeCarrierFailureModesOutputSchema,
  },
  async input => {
    const {output} = await analyzeCarrierFailureModesPrompt(input);
    return output!;
  }
);
