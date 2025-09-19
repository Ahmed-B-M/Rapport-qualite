'use server';
/**
 * @fileOverview Sentiment analysis of delivery feedback comments.
 *
 * - analyzeCommentSentiment - A function that analyzes the sentiment of delivery feedback comments.
 * - AnalyzeCommentSentimentInput - The input type for the analyzeCommentSentiment function.
 * - AnalyzeCommentSentimentOutput - The return type for the analyzeCommentSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCommentSentimentInputSchema = z.object({
  comment: z.string().describe('The delivery feedback comment to analyze.'),
});
export type AnalyzeCommentSentimentInput = z.infer<
  typeof AnalyzeCommentSentimentInputSchema
>;

const AnalyzeCommentSentimentOutputSchema = z.object({
  sentimentScore: z
    .number()
    .describe(
      'The sentiment score of the comment, ranging from -1 (negative) to 1 (positive).'
    ),
  isOutlier: z
    .boolean()
    .describe(
      'Whether the comment is an extreme outlier (very positive or very negative).'
    ),
});
export type AnalyzeCommentSentimentOutput = z.infer<
  typeof AnalyzeCommentSentimentOutputSchema
>;

export async function analyzeCommentSentiment(
  input: AnalyzeCommentSentimentInput
): Promise<AnalyzeCommentSentimentOutput> {
  return analyzeCommentSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCommentSentimentPrompt',
  input: {schema: AnalyzeCommentSentimentInputSchema},
  output: {schema: AnalyzeCommentSentimentOutputSchema},
  prompt: `You are a sentiment analysis expert. Analyze the sentiment of the following delivery feedback comment and determine if it is an outlier (very positive or very negative).\n\nComment: {{{comment}}}\n\nOutput a sentiment score between -1 and 1, and set the isOutlier flag accordingly. Consider a score of greater than 0.8 or less than -0.8 an outlier.`,
});

const analyzeCommentSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeCommentSentimentFlow',
    inputSchema: AnalyzeCommentSentimentInputSchema,
    outputSchema: AnalyzeCommentSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
