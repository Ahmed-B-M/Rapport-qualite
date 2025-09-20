
'use client';

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, MessageSquareQuote, ThumbsDown } from 'lucide-react';

interface CustomerSatisfactionProps {
    data: Delivery[];
}

export function CustomerSatisfaction({ data }: CustomerSatisfactionProps) {
    const satisfactionStats = useMemo(() => {
        const comments = data.filter(d => d.feedbackComment).map(d => ({
            comment: d.feedbackComment!,
            rating: d.deliveryRating!,
            driver: d.driver,
        })).reverse(); // Show most recent first

        const globalStats = aggregateStats(data, 'driver')['global']; // Assuming 'global' key exists or is handled
        const averageRating = globalStats?.averageRating ?? 0;
        const totalRatings = globalStats?.ratedDeliveries ?? 0;

        return { comments, averageRating, totalRatings };
    }, [data]);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Satisfaction Client</CardTitle>
                <CardDescription>
                    Note moyenne de {satisfactionStats.averageRating.toFixed(2)}/5 basée sur {satisfactionStats.totalRatings} évaluations.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {satisfactionStats.comments.slice(0, 5).map((item, index) => ( // Show top 5 recent comments
                        <div key={index} className="flex items-start space-x-4">
                            <div>
                                {item.rating >= 4 ? <Star className="h-5 w-5 text-yellow-400" /> : <ThumbsDown className="h-5 w-5 text-red-500" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{item.driver}</p>
                                <p className="text-sm text-muted-foreground italic">"{item.comment}"</p>
                            </div>
                            <div className="text-sm font-bold">{item.rating}/5</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
