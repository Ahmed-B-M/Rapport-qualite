
'use client';

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { analyzeSentiment, getTopComments } from '@/lib/sentiment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, MessageSquareQuote, ThumbsDown, ThumbsUp, Smile, Frown } from 'lucide-react';

interface CustomerSatisfactionProps {
    data: Delivery[];
}

const CommentCard = ({ title, comments, icon: Icon, colorClass }: { title: string, comments: { comment: string, score: number, driver: string }[], icon: React.ElementType, colorClass: string }) => (
    <div>
        <h4 className={`flex items-center font-headline text-lg font-semibold mb-2 ${colorClass}`}>
            <Icon className="h-5 w-5 mr-2" />
            {title}
        </h4>
        <div className="space-y-3">
            {comments.length > 0 ? comments.map((c, index) => (
                <div key={index} className="border-l-4 pl-3" style={{ borderColor: colorClass.split(' ')[0].replace('text-', 'border-') }}>
                    <p className="text-sm italic">"{c.comment}"</p>
                    <p className="text-xs text-muted-foreground mt-1">- {c.driver} (Note: {c.score.toFixed(1)}/10)</p>
                </div>
            )) : <p className="text-sm text-muted-foreground italic">Aucun commentaire pertinent.</p>}
        </div>
    </div>
);

export function CustomerSatisfaction({ data }: CustomerSatisfactionProps) {
    const sentimentAnalysis = useMemo(() => {
        const commentedDeliveries = data.filter(d => d.feedbackComment && d.feedbackComment.trim().length > 1);
        if (commentedDeliveries.length === 0) {
            return {
                averageScore: 0,
                topPositive: [],
                topNegative: []
            };
        }

        const totalScore = commentedDeliveries.reduce((sum, d) => sum + analyzeSentiment(d.feedbackComment!, d.deliveryRating).score, 0);
        const averageScore = totalScore / commentedDeliveries.length;

        const topPositive = getTopComments(commentedDeliveries, 'positive', 3);
        const topNegative = getTopComments(commentedDeliveries, 'negative', 3);

        return { averageScore, topPositive, topNegative };
    }, [data]);
    
    const getSentimentColor = (score: number) => {
        if (score > 7) return "text-green-500";
        if (score < 4) return "text-red-500";
        return "text-yellow-500";
    }

    return (
        <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <CardTitle className="font-headline text-lg">Analyse des Commentaires</CardTitle>
                <CardDescription>
                    Analyse des commentaires clients pour mesurer la satisfaction.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center mb-6">
                    <h3 className="text-sm text-muted-foreground mb-2">Note Moyenne des Commentaires</h3>
                    <p className={`text-5xl font-bold font-mono ${getSentimentColor(sentimentAnalysis.averageScore)}`}>
                        {sentimentAnalysis.averageScore.toFixed(2)} / 10
                    </p>
                     <p className="text-xs text-muted-foreground mt-1">
                        (Positif &gt; 7, Négatif &lt; 4)
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <CommentCard 
                        title="Top Positifs"
                        comments={sentimentAnalysis.topPositive}
                        icon={ThumbsUp}
                        colorClass="text-green-600"
                   />
                   <CommentCard 
                        title="Top Négatifs"
                        comments={sentimentAnalysis.topNegative}
                        icon={ThumbsDown}
                        colorClass="text-red-600"
                   />
                </div>
            </CardContent>
        </Card>
    );
}
