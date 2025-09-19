'use server';
/**
 * @fileOverview Analyzes and categorizes negative customer feedback.
 *
 * - analyzeCustomerFeedback - Analyzes a list of negative comments and categorizes them.
 * - AnalyzeCustomerFeedbackInput - The input type for the analyzeCustomerFeedback function.
 * - AnalyzeCustomerFeedbackOutput - The return type for the analyzeCustomerFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCustomerFeedbackInputSchema = z.object({
  comments: z
    .array(z.string())
    .describe('A list of negative customer feedback comments.'),
});
export type AnalyzeCustomerFeedbackInput = z.infer<
  typeof AnalyzeCustomerFeedbackInputSchema
>;

const FeedbackCategorySchema = z.enum([
    "Attitude du livreur",
    "Problème de communication",
    "Retard de livraison",
    "Non-respect des instructions",
    "Colis endommagé",
    "Problème d'adresse",
    "Autre"
]);

const AnalyzeCustomerFeedbackOutputSchema = z.object({
  categoryCounts: z.record(FeedbackCategorySchema, z.number())
    .describe('A count of comments for each predefined category.'),
  analysisSummary: z
    .string()
    .describe('A brief summary in French of the main issues identified in the comments.'),
});
export type AnalyzeCustomerFeedbackOutput = z.infer<
  typeof AnalyzeCustomerFeedbackOutputSchema
>;

export async function analyzeCustomerFeedback(
  input: AnalyzeCustomerFeedbackInput
): Promise<AnalyzeCustomerFeedbackOutput> {
  return analyzeCustomerFeedbackFlow(input);
}

const analyzeCustomerFeedbackPrompt = ai.definePrompt({
  name: 'analyzeCustomerFeedbackPrompt',
  input: {schema: AnalyzeCustomerFeedbackInputSchema},
  output: {schema: AnalyzeCustomerFeedbackOutputSchema},
  prompt: `Vous êtes un expert de l'analyse des retours clients pour un service de livraison. Votre réponse doit être en français.

  Analysez la liste suivante de commentaires négatifs de clients. Pour chaque commentaire, classez-le dans l'une des catégories suivantes : ${FeedbackCategorySchema.options.join(', ')}.

  Les commentaires :
  {{#each comments}}- {{{this}}}{{/each}}

  Fournissez un décompte du nombre de commentaires pour chaque catégorie.
  Fournissez également un bref résumé (2-3 phrases maximum) des principaux problèmes soulevés par ces commentaires.`,
});

const analyzeCustomerFeedbackFlow = ai.defineFlow(
  {
    name: 'analyzeCustomerFeedbackFlow',
    inputSchema: AnalyzeCustomerFeedbackInputSchema,
    outputSchema: AnalyzeCustomerFeedbackOutputSchema,
  },
  async input => {
    if (input.comments.length === 0) {
        return {
            categoryCounts: {},
            analysisSummary: "Aucun commentaire négatif à analyser."
        }
    }
    const {output} = await analyzeCustomerFeedbackPrompt(input);
    return output!;
  }
);
