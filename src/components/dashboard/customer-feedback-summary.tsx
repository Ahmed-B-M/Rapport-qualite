
"use client"

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquareQuote, ChevronsRight } from 'lucide-react';
import { aggregateStats } from '@/lib/data-processing';
import { cn } from '@/lib/utils';

interface CustomerFeedbackSummaryProps {
  data: Delivery[];
  onClick?: () => void;
}

export function CustomerFeedbackSummary({ data, onClick }: CustomerFeedbackSummaryProps) {
  
  const comments = useMemo(() => data.map(d => d.feedbackComment!).filter(Boolean), [data]);
  const negativeCommentCount = useMemo(() => data.filter(d => d.deliveryRating && d.deliveryRating <= 3 && d.feedbackComment).length, [data]);

  return (
    <Card onClick={onClick} className={cn(onClick && 'cursor-pointer hover:bg-muted/20 transition-colors')}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
                <MessageSquareQuote /> Retours Clients
            </CardTitle>
            {onClick && (
                <div className="text-xs text-primary hover:underline flex items-center gap-1 no-print">
                    Voir l'analyse détaillée <ChevronsRight className="h-3 w-3"/>
                </div>
            )}
        </div>
        <CardDescription>
          Nombre de commentaires négatifs (note ≤ 3).
        </CardDescription>
      </CardHeader>
      <CardContent>
          {comments.length === 0 ? (
             <div className="flex h-24 flex-col items-center justify-center text-center text-muted-foreground">
                <p className="font-semibold">Aucun commentaire sur cette période.</p>
            </div>
          ) : (
             <div className="text-4xl font-bold text-destructive">
                {negativeCommentCount}
             </div>
          )
        }
      </CardContent>
    </Card>
  )
}
