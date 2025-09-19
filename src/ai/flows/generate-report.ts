'use server';
/**
 * @fileOverview Generates a comprehensive performance report.
 *
 * - generatePerformanceReport - Analyzes overall data and customer feedback to create a summary report.
 * - GeneratePerformanceReportInput - The input type for the generatePerformanceReport function.
 * - GeneratePerformanceReportOutput - The return type for the generatePerformanceReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePerformanceReportInputSchema = z.object({
  overallStats: z.string().describe("A JSON string of the overall performance statistics (KPIs)."),
  rankings: z.string().describe("A JSON string of the top and flop rankings for all entities and metrics."),
  warehouseStats: z.string().describe("A JSON string of the statistics aggregated by warehouse."),
  customerComments: z.array(z.string()).describe("A list of all customer feedback comments."),
  storesExcluded: z.boolean().describe("A boolean indicating if the stores (Magasin) are excluded from the data.")
});
export type GeneratePerformanceReportInput = z.infer<typeof GeneratePerformanceReportInputSchema>;

const GeneratePerformanceReportOutputSchema = z.object({
  reportMarkdown: z.string().describe("The full performance report formatted in Markdown.")
});
export type GeneratePerformanceReportOutput = z.infer<typeof GeneratePerformanceReportOutputSchema>;

export async function generatePerformanceReport(input: GeneratePerformanceReportInput): Promise<GeneratePerformanceReportOutput> {
  return generatePerformanceReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePerformanceReportPrompt',
  input: { schema: GeneratePerformanceReportInputSchema },
  output: { schema: GeneratePerformanceReportOutputSchema },
  prompt: `Vous êtes un analyste expert en logistique et en expérience client pour Carrefour. Votre mission est de générer un rapport de performance complet, visuel et synthétique en français, basé sur les données fournies. Le rapport doit être au format Markdown et facile à imprimer en PDF.

**Structure du Rapport :**

1.  **Titre :** "# Rapport de Performance des Livraisons"
    {{#if storesExcluded}}
    > *Note : Les données des magasins sont exclues de ce rapport.*
    {{/if}}

2.  **Analyse Globale des KPIs :**
    *   Créez un sous-titre "## Analyse Globale des Indicateurs Clés".
    *   Analysez brièvement les KPIs globaux fournis. Mettez en évidence 1 à 2 points forts et 1 à 2 points faibles majeurs. Utilisez des icônes emoji pour illustrer (ex: ✅, ⚠️, 🚀, 📉).

3.  **Performance par Entrepôt :**
    *   Créez un sous-titre "## Performance par Entrepôt".
    *   Pour chaque entrepôt dans les données, créez un sous-titre de niveau 3 (par ex: "### Entrepôt de Vitry").
    *   Pour chaque entrepôt, fournissez une analyse concise de ses performances spécifiques (ponctualité, satisfaction, taux d'échec). Identifiez ses forces et faiblesses principales. Utilisez des listes à puces.

4.  **Analyse des Retours Clients :**
    *   Créez un sous-titre "## Analyse Qualitative des Retours Clients".
    *   Analysez l'ensemble des commentaires clients.
    *   Identifiez les 3 thèmes majeurs (positifs ou négatifs) qui ressortent.
    *   Pour chaque thème, citez 1 ou 2 commentaires anonymisés très courts et représentatifs.
    *   Utilisez des sous-titres de niveau 3 pour chaque thème (ex: "### Thème : Amabilité des livreurs").

5.  **Synthèse et Recommandations :**
    *   Créez un sous-titre "## Synthèse et Recommandations".
    *   Rédigez une brève synthèse globale (3-4 lignes).
    *   Proposez 2 à 3 recommandations concrètes, priorisées et réalisables pour améliorer les performances globales. Formatez-les en liste numérotée.

**Données d'Analyse :**

*   **Statistiques Globales (KPIs) :**
    \`\`\`json
    {{{overallStats}}}
    \`\`\`

*   **Classements Top/Flop :**
    \`\`\`json
    {{{rankings}}}
    \`\`\`

*   **Statistiques par Entrepôt :**
    \`\`\`json
    {{{warehouseStats}}}
    \`\`\`

*   **Commentaires Clients Bruts :**
    \`\`\`
    {{#each customerComments}}- {{{this}}}{{/each}}
    \`\`\`

**Instructions de Style :**
*   Le ton doit être professionnel, direct et orienté vers l'action.
*   Utilisez abondamment le formatage Markdown (titres, listes, gras) pour la clarté.
*   Soyez concis. Chaque section doit aller droit au but.
*   La totalité de la réponse DOIT être le rapport en Markdown.`,
});

const generatePerformanceReportFlow = ai.defineFlow(
  {
    name: 'generatePerformanceReportFlow',
    inputSchema: GeneratePerformanceReportInputSchema,
    outputSchema: GeneratePerformanceReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
