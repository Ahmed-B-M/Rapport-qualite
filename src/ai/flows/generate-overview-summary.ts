'use server';
/**
 * @fileOverview Generates an executive summary for the performance overview.
 *
 * - generateOverviewSummary - Analyzes overall stats and rankings to create a summary.
 * - GenerateOverviewSummaryInput - The input type for the generateOverviewSummary function.
 * - GenerateOverviewSummaryOutput - The return type for the generateOverviewSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateOverviewSummaryInputSchema = z.object({
  overallStats: z.string().describe("A JSON string of the overall performance statistics (KPIs)."),
  rankings: z.string().describe("A JSON string of the top and flop rankings for all entities and metrics."),
});
export type GenerateOverviewSummaryInput = z.infer<typeof GenerateOverviewSummaryInputSchema>;

const GenerateOverviewSummaryOutputSchema = z.object({
  summary: z.string().describe("The executive summary in French, formatted as a short paragraph. Use markdown for bolding.")
});
export type GenerateOverviewGnerateOverviewSummaryOutput = z.infer<typeof GenerateOverviewSummaryOutputSchema>;

export async function generateOverviewSummary(input: GenerateOverviewSummaryInput): Promise<GenerateOverviewGnerateOverviewSummaryOutput> {
  return generateOverviewSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOverviewSummaryPrompt',
  input: { schema: GenerateOverviewSummaryInputSchema },
  output: { schema: GenerateOverviewSummaryOutputSchema },
  prompt: `Vous êtes un analyste logistique expert pour Carrefour. Votre mission est de rédiger un résumé exécutif très court (3-4 phrases maximum) et percutant en français.

Analysez les données de performance suivantes :

*   **KPIs Globaux :**
    \`\`\`json
    {{{overallStats}}}
    \`\`\`

*   **Classements Top/Flop :**
    \`\`\`json
    {{{rankings}}}
    \`\`\`

Rédigez un paragraphe de synthèse qui met en évidence :
1.  **Le point fort principal :** L'indicateur le plus performant ou une tendance très positive.
2.  **Le point faible majeur :** L'indicateur le plus préoccupant ou un problème récurrent dans les "flops".
3.  **Un fait marquant ou une recommandation :** Une observation intéressante ou une action prioritaire à envisager.

Utilisez des **mots en gras** pour les points clés. Le ton doit être direct, professionnel et orienté vers l'action.`,
});

const generateOverviewSummaryFlow = ai.defineFlow(
  {
    name: 'generateOverviewSummaryFlow',
    inputSchema: GenerateOverviewSummaryInputSchema,
    outputSchema: GenerateOverviewSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
