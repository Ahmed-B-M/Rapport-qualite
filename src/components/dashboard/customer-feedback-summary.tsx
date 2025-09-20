
"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { analyzeCustomerFeedback, type AnalyzeCustomerFeedbackOutput } from '@/ai/flows/analyze-customer-feedback';
import { Loader2, MessageSquareQuote, Bot } from 'lucide-react';
import { ChevronsRight } from 'lucide-react';

interface CustomerFeedbackSummaryProps {
  data: Delivery[];
  onClick?: () => void;
}

export function CustomerFeedbackSummary({ data, onClick }: CustomerFeedbackSummaryProps) {
  const [analysis, setAnalysis] = useState<AnalyzeCustomerFeedbackOutput | null>(null);
  const [loading, setLoading] = useState(true);

  const comments = useMemo(() => data.map(d => d.feedbackComment!).filter(Boolean), [data]);

  useEffect(() => {
    if (comments.length === 0) {
      setLoading(false);
      setAnalysis({
        categoryCounts: {},
        analysisSummary: "Aucun commentaire négatif à analyser.",
      });
      return;
    }

    const performAnalysis = async () => {
      setLoading(true);
      try {
        const result = await analyzeCustomerFeedback({ comments });
        setAnalysis(result);
      } catch (error) {
        console.error("AI feedback analysis failed:", error);
        setAnalysis({ categoryCounts: {}, analysisSummary: "L'analyse par IA a échoué." });
      }
      setLoading(false);
    };

    performAnalysis();
  }, [comments]);

  const analysisData = useMemo(() => (
    analysis ? Object.entries(analysis.categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Keep top 5
    : []
  ), [analysis]);

  return (
    <Card onClick={onClick} className={onClick ? 'cursor-pointer hover:bg-muted/20 transition-colors' : ''}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
                <Bot /> Analyse des Retours Clients Négatifs
            </CardTitle>
            {onClick && (
                <div className="text-xs text-primary hover:underline flex items-center gap-1 no-print">
                    Voir l'analyse détaillée <ChevronsRight className="h-3 w-3"/>
                </div>
            )}
        </div>
        <CardDescription>
          Une synthèse par IA des principaux points de friction remontés par les clients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin h-5 w-5" />
            <span>Analyse des commentaires en cours...</span>
          </div>
        ) : (
          comments.length === 0 ? (
             <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
                <MessageSquareQuote className="h-10 w-10 mb-4" />
                <p className="font-semibold">Aucun commentaire négatif.</p>
                <p>Les clients n'ont laissé aucun commentaire négatif sur cette période.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2 text-sm">Principales catégories de problèmes</h4>
                {analysisData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={analysisData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 11 }} />
                      <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="count" name="Nombre" fill="hsl(var(--destructive))" barSize={16} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune catégorie spécifique n'a été identifiée.</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm">Synthèse de l'analyse</h4>
                <p className="text-sm text-muted-foreground italic">"{analysis?.analysisSummary}"</p>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
