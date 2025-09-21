
'use client';

import { useMemo } from 'react';
import { type Livraison } from '@/lib/definitions';
import { agregerStatistiquesParEntite } from '@/lib/analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, MessageSquareQuote, ThumbsDown } from 'lucide-react';

interface CustomerFeedbackSummaryProps {
  donnees?: Livraison[];
}

export function CustomerFeedbackSummary({ donnees }: CustomerFeedbackSummaryProps) {
  const statistiquesSatisfaction = useMemo(() => {
    if (!donnees) {
      return {
        commentaires: [],
        noteMoyenne: 0,
        totalNotes: 0,
      };
    }

    const commentaires = donnees
      .filter(l => l.commentaireRetour)
      .map(l => ({
        commentaire: l.commentaireRetour!,
        note: l.noteLivraison!,
        chauffeur: l.chauffeur,
      }))
      .reverse();

    const stats = agregerStatistiquesParEntite(donnees, 'chauffeur');
    // Simplified logic to get some global stats. This could be improved.
    const noteMoyenne = donnees.filter(d => d.noteLivraison).reduce((acc, d) => acc + d.noteLivraison!, 0) / donnees.filter(d => d.noteLivraison).length || 0;
    const totalNotes = donnees.filter(d => d.noteLivraison).length;

    return { commentaires, noteMoyenne, totalNotes };
  }, [donnees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Derniers Retours Clients</CardTitle>
        <CardDescription>
          Note moyenne de {statistiquesSatisfaction.noteMoyenne.toFixed(2)}/5 basée sur {statistiquesSatisfaction.totalNotes} évaluations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statistiquesSatisfaction.commentaires.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div>
                {item.note >= 4 ? <Star className="h-5 w-5 text-yellow-400" /> : <ThumbsDown className="h-5 w-5 text-red-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.chauffeur}</p>
                <p className="text-sm text-muted-foreground italic">"{item.commentaire}"</p>
              </div>
              <div className="text-sm font-bold">{item.note}/5</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
