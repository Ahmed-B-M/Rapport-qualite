
'use client';

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { getOverallStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, MessageSquareQuote, ThumbsDown } from 'lucide-react';
import { type Objectives, type DetailViewState } from '@/app/page'; // Assuming types are exported from page

interface CustomerSatisfactionProps {
    data: Delivery[];
    objectives?: Objectives;
    onNavigate?: (view: string, detail?: Partial<DetailViewState>) => void;
}

export function CustomerSatisfaction({ data, objectives, onNavigate }: CustomerSatisfactionProps) {
    const satisfactionStats = useMemo(() => {
        const comments = data.filter(d => d.feedbackComment).map(d => ({
            comment: d.feedbackComment!,
            rating: d.deliveryRating!,
            driver: d.driver,
        })).reverse();

        const globalStats = getOverallStats(data);
        const averageRating = globalStats?.averageRating ?? 0;
        const totalRatings = globalStats?.ratedDeliveries ?? 0;

        return { comments, averageRating, totalRatings };
    }, [data]);
    
    // A simple check to see if we're in a detailed view or a summary view
    const isDetailedView = !!objectives && !!onNavigate;

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
                    {/* In detailed view, show more comments */}
                    {satisfactionStats.comments.slice(0, isDetailedView ? 20 : 5).map((item, index) => (
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
